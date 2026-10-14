const ZONES = ["north", "south", "east", "west", "central", "harbour"];
const CHANNEL_COUNT = 900;
const LIBRARY_SIZE = 30;
const ZERO_WIDTH = String.fromCharCode(0x200b);
const P = "populated";
const E = "empty";
const DOCS = { url: "https://docs.metroflow.example.com/tags" };

const LIBRARY_VARIANTS = [
  (name) => [{ name, description: `Shared tag ${name}.`, externalDocs: DOCS, "x-owner": "mobility-platform" }, { name: P, description: P }],
  (name) => [{ name }, { name: P }],
  (name) => [{ name, description: `${ZERO_WIDTH} `, externalDocs: {} }, { name: P, description: E }],
  (name) => [{ name, description: `Shared tag ${name}.`, "x-owner": null }, { name: P, description: P }],
  () => [{ description: "Shared tag without name." }, { description: P }],
];

const VARIANTS = [
  [(name) => ({ name, description: `Events of ${name}.` }), { name: P, description: P }, true],
  [(name) => ({ name }), { name: P }, true],
  [(name) => ({ name, description: "\n" }), { name: P, description: E }, true],
  [() => ({ description: "Unnamed tag." }), { description: P }, false],
  [() => ({}), {}, false],
  [() => ({ name: null, description: "Null name." }), { name: E, description: P }, false],
  [(name) => ({ name, description: [], externalDocs: DOCS }), { name: P, description: E }, true],
  [(name) => ({ name, description: `Events of ${name}.`, externalDocs: DOCS, "x-owner": "mobility-platform" }), { name: P, description: P }, true],
];

const tags = [];
const invalid = [];

const libraryTags = {};
for (let l = 0; l < LIBRARY_SIZE; l++) {
  const name = `library-${l}`;
  const [tag, states] = LIBRARY_VARIANTS[l % LIBRARY_VARIANTS.length](name);
  libraryTags[name] = tag;
  tags.push([`components.tags.${name}`, tag.name === undefined ? undefined : name, states]);
}

let counter = 0;
const place = (path) => {
  const index = counter++;
  if (index % 13 === 5) return { $ref: `#/components/tags/library-${index % LIBRARY_SIZE}` };
  if (index % 13 === 11) {
    invalid.push([path, "named", `plain-${index}`]);
    return `plain-${index}`;
  }
  if (index % 19 === 7) {
    invalid.push([path, "reference", `#/components/tags/missing-${index}`]);
    return { $ref: `#/components/tags/missing-${index}` };
  }
  if (index % 31 === 2) {
    invalid.push([path, "invalid"]);
    return 0;
  }
  const [build, states, named] = VARIANTS[index % VARIANTS.length];
  const name = `tag-${index}`;
  tags.push([path, named ? name : undefined, states]);
  return build(name);
};

const channels = {};
const operations = {};
for (let i = 0; i < CHANNEL_COUNT; i++) {
  const zone = ZONES[i % ZONES.length];
  const key = `${zone}Vehicles${i}`;
  channels[key] = {
    address: i % 7 === 0 ? null : `metroflow/${zone}/vehicles/${i}/positions`,
    tags: [place(`channels.${key}.tags.0`)],
    messages: {
      positionReported: {
        name: `positionReported${i}`,
        tags: [place(`channels.${key}.messages.positionReported.tags.0`), place(`channels.${key}.messages.positionReported.tags.1`)],
        payload: {
          schemaFormat: "application/vnd.apache.avro;version=1.9.0",
          schema: { type: "record", name: "Position", fields: [{ name: "tags", type: ["null", { type: "array", items: "string" }], default: null }] },
        },
      },
    },
  };
  operations[`report${key}`] = {
    action: i % 2 === 0 ? "send" : "receive",
    channel: { $ref: `#/channels/${key}` },
    messages: [{ $ref: `#/channels/${key}/messages/positionReported` }],
    tags: i % 6 === 0 ? { $ref: "#/components/x-tag-sets/shared" } : [place(`operations.report${key}.tags.0`)],
  };
}

const shared = [0, 1, 2, 3].map((s) => place(`components.x-tag-sets.shared.${s}`));

module.exports = {
  document: {
    asyncapi: "3.0.0",
    id: "urn:metroflow:vehicle-positions",
    info: { title: "MetroFlow Vehicle Positions", version: "9.0.0", description: "Every vehicle position stream of the MetroFlow transit network." },
    channels,
    operations,
    components: { tags: libraryTags, "x-tag-sets": { shared } },
  },
  tags,
  invalid,
};
