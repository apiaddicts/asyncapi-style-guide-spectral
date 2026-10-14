const DOMAINS = ["orders", "payments", "shipments", "inventory", "customers", "invoices", "returns", "pricing"];
const CHANNEL_COUNT = 1200;
const LIBRARY_SIZE = 40;
const ZERO_WIDTH = String.fromCharCode(0x200b);
const P = "populated";
const E = "empty";
const DOCS = { url: "https://docs.retail.example.com/tags" };

const LIBRARY_VARIANTS = [
  (name) => [{ name, description: `Shared tag ${name}.`, externalDocs: DOCS, "x-owner": "retail-platform" }, { name: P, description: P, externalDocs: P, "x-owner": P }],
  (name) => [{ name }, { name: P }],
  (name) => [{ name, description: `${ZERO_WIDTH}  `, externalDocs: {} }, { name: P, description: E, externalDocs: E }],
  (name) => [{ name, description: `Shared tag ${name}.`, "x-owner": "" }, { name: P, description: P, "x-owner": E }],
];

const VARIANTS = [
  [(name) => ({ name, description: `Events of ${name}.` }), { name: P, description: P }, true],
  [(name) => ({ name }), { name: P }, true],
  [(name) => ({ name, description: "" }), { name: P, description: E }, true],
  [() => ({ description: "Unnamed tag." }), { description: P }, false],
  [() => ({}), {}, false],
  [() => ({ name: "  ", description: "Blank name." }), { name: E, description: P }, false],
  [(name) => ({ name, description: null, externalDocs: DOCS }), { name: P, description: E, externalDocs: P }, true],
  [(name) => ({ name, description: `Events of ${name}.`, externalDocs: DOCS, "x-owner": "retail-platform" }), { name: P, description: P, externalDocs: P, "x-owner": P }, true],
];

const library = {};
const referenced = new Set();
for (let l = 0; l < LIBRARY_SIZE; l++) {
  const name = `library-${l}`;
  library[name] = LIBRARY_VARIANTS[l % LIBRARY_VARIANTS.length](name)[0];
}

const tags = [];
const invalid = [];
let counter = 0;

const place = (path) => {
  const index = counter++;
  if (index % 11 === 7) {
    const name = `library-${index % LIBRARY_SIZE}`;
    referenced.add(name);
    return { $ref: `#/components/x-tag-library/${name}` };
  }
  if (index % 11 === 9) {
    invalid.push([path, "named", `plain-${index}`]);
    return `plain-${index}`;
  }
  if (index % 23 === 13) {
    invalid.push([path, "reference", `#/components/x-tag-library/missing-${index}`]);
    return { $ref: `#/components/x-tag-library/missing-${index}` };
  }
  if (index % 29 === 3) {
    invalid.push([path, "invalid"]);
    return null;
  }
  const [build, states, named] = VARIANTS[index % VARIANTS.length];
  const name = `tag-${index}`;
  tags.push([path, named ? name : undefined, states]);
  return build(name);
};

const channels = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const domain = DOMAINS[i % DOMAINS.length];
  const key = `retail.cdc.${domain}.event-${i}.v1`;
  const base = `channels.${key}`;
  channels[key] = {
    description: `Change data capture of ${domain}, partition group ${i}.`,
    publish: {
      operationId: `publish${domain}${i}`,
      tags: [place(`${base}.publish.tags.0`), place(`${base}.publish.tags.1`)],
      message: {
        name: `${domain}Changed${i}`,
        tags: [place(`${base}.publish.message.tags.0`)],
        payload: { type: "object", properties: { tags: { type: ["array", "null"], items: { type: "string" } } } },
      },
    },
    subscribe: {
      operationId: `receive${domain}${i}`,
      tags: i % 5 === 0 ? { $ref: "#/components/x-tag-sets/shared" } : [place(`${base}.subscribe.tags.0`)],
      message: { $ref: `#/components/messages/shared${i % 4}` },
    },
  };
}

const sharedSet = [0, 1, 2].map((s) => place(`components.x-tag-sets.shared.${s}`));

const messages = {};
for (let s = 0; s < 4; s++) {
  messages[`shared${s}`] = { name: `shared${s}`, tags: [place(`components.messages.shared${s}.tags.0`)], payload: { type: "object" } };
}

for (const name of referenced) {
  const index = Number(name.slice("library-".length));
  tags.push([`components.x-tag-library.${name}`, name, LIBRARY_VARIANTS[index % LIBRARY_VARIANTS.length](name)[1]]);
}

module.exports = {
  document: {
    asyncapi: "2.6.0",
    id: "urn:retail:event-catalogue",
    info: { title: "Retail Event Catalogue", version: "12.0.0", description: "Every change data capture stream of the retail platform." },
    channels,
    components: { messages, "x-tag-library": library, "x-tag-sets": { shared: sharedSet } },
  },
  tags,
  invalid,
};
