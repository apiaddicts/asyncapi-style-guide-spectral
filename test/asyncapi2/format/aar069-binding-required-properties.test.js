const { linterForRule, BINDING_KEY_CASES, REQUIRED_BINDING_CASES } = require("../../helpers/utils");
const okExample = require("./AAR069/ok-example");
const failExample = require("./AAR069/fail-example");
const failTraitsMerge = require("./AAR069/fail-traits-merge");
const failSharedRef = require("./AAR069/fail-shared-ref");
const okStructuralEdges = require("./AAR069/ok-structural-edges");
const failLargeGenerated = require("./AAR069/fail-large-generated");

const RULE = "asa:AAR069";
const C1 = "channels.fulfilment.orders.placed.v1";
const C2 = "channels.fleet/{vehicleId}/telemetry";
const M = (channel) => `channels.merge/${channel}`;
const LABELS = { server: "Server", channel: "Channel", operation: "Operation", message: "Message" };
const HOLDERS = {
  server: ["servers", "probe", "bindings"],
  channel: ["channels", "probe", "bindings"],
  operation: ["channels", "probe", "publish", "bindings"],
  message: ["channels", "probe", "publish", "message", "bindings"],
};

const only = (results) => results.filter((r) => r.code === RULE);
const findings = (results) => only(results).map((r) => `${r.path.join(".")} :: ${r.message}`).sort();
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });
const withOptions = (value) => linterForRule(RULE, { functionOptions: { required_binding_props: value } });
const quoted = (fields) => {
  const names = fields.map((field) => `'${field}'`);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
};
const message = (kind, protocol, ...fields) => `AAR069: ${kind} binding '${protocol}' must declare ${quoted(fields)}.`;
const finding = (path, kind, protocol, ...fields) => `${path} :: ${message(kind, protocol, ...fields)}`;
const render = (steps) => steps.reduce((text, step) => (typeof step === "number" ? `${text}[${step}]` : text === "" ? step : `${text}.${step}`), "");
const clone = (value) => JSON.parse(JSON.stringify(value));
const base = (extra) => ({ asyncapi: "2.6.0", info: { title: "Required Binding Fields", version: "1.0.0" }, ...extra });

const setAt = (target, steps, value) => {
  let node = target;
  steps.slice(0, -1).forEach((step, index) => {
    if (node[step] === undefined) node[step] = typeof steps[index + 1] === "number" ? [] : {};
    node = node[step];
  });
  node[steps[steps.length - 1]] = value;
  return target;
};
const removeAt = (target, steps) => {
  const parent = steps.slice(0, -1).reduce((node, step) => node[step], target);
  delete parent[steps[steps.length - 1]];
  return target;
};
const placeBindings = (kind, bindings) => setAt(base(), HOLDERS[kind], bindings);
const completeBinding = (kind, protocol) => clone(REQUIRED_BINDING_CASES.complete[kind][protocol]);
const fieldsOf = ([, , steps, alternatives]) => alternatives || [render(steps)];
const parentPath = ([kind, protocol, steps]) => [...HOLDERS[kind], protocol, ...steps.slice(0, -1)].join(".");

const FAIL_EXAMPLE = [
  finding("servers.jmsPrimary.bindings.jms", "Server", "jms", "jmsConnectionFactory"),
  finding("servers.jmsPrimary.bindings.jms.properties.1", "Server", "jms", "properties[1].name"),
  finding("servers.jmsPrimary.bindings.jms.properties.2", "Server", "jms", "properties[2].value"),
  finding("servers.jmsBlank.bindings.jms", "Server", "jms", "jmsConnectionFactory"),
  finding(`${C1}.bindings.amqp`, "Channel", "amqp", "exchange", "queue"),
  finding(`${C1}.bindings.sqs.queue`, "Channel", "sqs", "queue.fifoQueue"),
  finding(`${C1}.bindings.sqs.queue.policy.statements.0`, "Channel", "sqs", "queue.policy.statements[0].action"),
  finding(`${C1}.bindings.sqs.queue.policy.statements.1`, "Channel", "sqs", "queue.policy.statements[1].effect"),
  finding(`${C1}.bindings.sqs.deadLetterQueue`, "Channel", "sqs", "deadLetterQueue.name"),
  finding(`${C1}.bindings.sns`, "Channel", "sns", "name"),
  finding(`${C1}.bindings.sns.ordering`, "Channel", "sns", "ordering.type"),
  finding(`${C1}.bindings.sns.policy`, "Channel", "sns", "policy.statements"),
  finding(`${C1}.publish.bindings.sns.consumers.0`, "Operation", "sns", "consumers[0].rawMessageDelivery"),
  finding(`${C1}.publish.bindings.sns.consumers.1.redrivePolicy`, "Operation", "sns", "consumers[1].redrivePolicy.deadLetterQueue"),
  finding(`${C1}.publish.traits.1.bindings.ros2`, "Operation", "ros2", "role"),
  finding(`${C1}.publish.traits.0`, "Operation", "sqs", "queues[1].name"),
  finding(`${C1}.publish.traits.0`, "Operation", "sqs", "queues[1].redrivePolicy.deadLetterQueue"),
  finding(`${C1}.publish.message.bindings.googlepubsub.schema`, "Message", "googlepubsub", "schema.name"),
  finding(`${C1}.subscribe.bindings.ros2`, "Operation", "ros2", "node"),
  finding(`${C1}.subscribe.message.oneOf.1.bindings.googlepubsub.schema`, "Message", "googlepubsub", "schema.name"),
  finding(`${C1}.subscribe.message.oneOf.2.traits.0.0.bindings.googlepubsub.schema`, "Message", "googlepubsub", "schema.name"),
  finding(`${C2}.bindings.googlepubsub`, "Channel", "googlepubsub", "schemaSettings"),
  finding(`${C2}.bindings.ibmmq.queue`, "Channel", "ibmmq", "queue.objectName"),
  finding(`${C2}.bindings.pulsar`, "Channel", "pulsar", "namespace"),
  finding(`${C2}.bindings.pulsar`, "Channel", "pulsar", "persistence"),
  finding(`${C2}.subscribe.bindings.sqs.queues.0.policy.statements.1`, "Operation", "sqs", "queues[0].policy.statements[1].effect"),
  finding(`${C2}.subscribe.bindings.sqs.queues.0.policy.statements.1`, "Operation", "sqs", "queues[0].policy.statements[1].principal"),
  finding(`${C2}.subscribe.bindings.sqs.queues.0.policy.statements.1`, "Operation", "sqs", "queues[0].policy.statements[1].action"),
  finding("components.servers.drJms.bindings.jms", "Server", "jms", "jmsConnectionFactory"),
  finding("components.channels.auditTrail.bindings.pulsar", "Channel", "pulsar", "persistence"),
  finding("components.channels.auditTrail.publish.bindings.sns", "Operation", "sns", "consumers"),
  finding("components.channels.auditTrail.publish.message.bindings.googlepubsub.schema", "Message", "googlepubsub", "schema.name"),
  finding("components.messages.shipmentEvents.oneOf.0.bindings.googlepubsub.schema", "Message", "googlepubsub", "schema.name"),
  finding("components.serverBindings.jmsShared.jms", "Server", "jms", "jmsConnectionFactory"),
  finding("components.serverBindings.jmsShared.jms.properties.0", "Server", "jms", "properties[0].value"),
  finding("components.channelBindings.sqsInvoices.sqs", "Channel", "sqs", "queue"),
  finding("components.operationBindings.snsFanout.ros2", "Operation", "ros2", "role"),
  finding("components.operationBindings.snsFanout.ros2", "Operation", "ros2", "node"),
  finding("components.messageBindings.pubsubKeyed.googlepubsub.schema", "Message", "googlepubsub", "schema.name"),
].sort();

const TRAITS_MERGE = [
  finding(`${M("arrays")}.publish.traits.0.bindings.sns.consumers.0`, "Operation", "sns", "consumers[0].endpoint"),
  finding(`${M("arrays")}.publish.traits.0.bindings.sns.consumers.0`, "Operation", "sns", "consumers[0].rawMessageDelivery"),
  finding(`${M("arrays")}.subscribe.traits.0.bindings.sqs.queues.0`, "Operation", "sqs", "queues[0].name"),
  finding(`${M("trait-order")}.publish.traits.1.bindings.sns.consumers.0`, "Operation", "sns", "consumers[0].endpoint"),
  finding(`${M("trait-order")}.publish.traits.1.bindings.sns.consumers.0`, "Operation", "sns", "consumers[0].rawMessageDelivery"),
  finding(`${M("blank")}.subscribe.traits.0.bindings.ros2`, "Operation", "ros2", "node"),
  finding(`${M("trait-only")}.publish.traits.0`, "Operation", "sns", "consumers[0].endpoint"),
  finding(`${M("trait-only")}.publish.traits.0`, "Operation", "sns", "consumers[0].rawMessageDelivery"),
  finding("components.operationBindings.rosRole.ros2", "Operation", "ros2", "node"),
  finding(`${M("scalar")}.publish.traits.0.bindings.ros2`, "Operation", "ros2", "role"),
  finding(`${M("empty-definition")}.publish.bindings.ros2`, "Operation", "ros2", "role"),
  finding(`${M("tuple-operation")}.publish.bindings.ros2`, "Operation", "ros2", "role"),
  finding(`${M("tuple-operation")}.publish.bindings.ros2`, "Operation", "ros2", "node"),
  ...["protocol", "endpoint", "rawMessageDelivery"].flatMap((field) => [
    finding(`${M("escaped")}.publish.traits.0`, "Operation", "sns", `consumers[0].${field}`),
    finding(`${M("escaped")}.subscribe.traits.0`, "Operation", "sns", `consumers[0].${field}`),
  ]),
  finding(`${M("escaped-tilde")}.publish.traits.0`, "Operation", "ros2", "node"),
  finding(`${M("messages")}.subscribe.message.oneOf.0.traits.0.0`, "Message", "googlepubsub", "schema.name"),
  finding(`${M("messages")}.subscribe.message.oneOf.1.traits.0`, "Message", "googlepubsub", "schema.name"),
  finding(`${M("messages")}.subscribe.message.oneOf.3.traits.0.bindings.googlepubsub.schema`, "Message", "googlepubsub", "schema.name"),
].sort();

const SHARED_REF = [
  finding("components.servers.drJms.bindings.jms", "Server", "jms", "jmsConnectionFactory"),
  finding("components.serverBindings.jmsChainEnd.jms", "Server", "jms", "jmsConnectionFactory"),
  finding("components.serverBindings.jmsChainEnd.jms.properties.0", "Server", "jms", "properties[0].value"),
  finding("components.channels.telemetry.bindings.pulsar", "Channel", "pulsar", "persistence"),
  finding("components.messages.positionReported.bindings.googlepubsub.schema", "Message", "googlepubsub", "schema.name"),
  finding("components.channelBindings.pulsarShared.pulsar", "Channel", "pulsar", "namespace"),
  finding("components.operationBindings.rosShared.ros2", "Operation", "ros2", "role"),
  finding("components.messageBindings.keyed.googlepubsub.schema", "Message", "googlepubsub", "schema.name"),
].sort();

const SERVER_BAD = { jms: {} };
const CHANNEL_BAD = { pulsar: { namespace: "yard" } };
const OPERATION_BAD = { ros2: { role: "publisher" } };
const MESSAGE_BAD = { googlepubsub: { schema: {} } };
const SERVER_FINDING = ["Server", "jms", "jmsConnectionFactory"];
const CHANNEL_FINDING = ["Channel", "pulsar", "persistence"];
const OPERATION_FINDING = ["Operation", "ros2", "node"];
const MESSAGE_FINDING = ["Message", "googlepubsub", "schema.name"];

const LOCATIONS = [
  ["server", "servers.s.bindings.jms", SERVER_FINDING, { servers: { s: { url: "tcp://mq:61616", protocol: "jms", bindings: SERVER_BAD } } }],
  ["channel", "channels.c.bindings.pulsar", CHANNEL_FINDING, { channels: { c: { bindings: CHANNEL_BAD } } }],
  ["publish operation", "channels.c.publish.bindings.ros2", OPERATION_FINDING, { channels: { c: { publish: { bindings: OPERATION_BAD } } } }],
  ["subscribe operation", "channels.c.subscribe.bindings.ros2", OPERATION_FINDING, { channels: { c: { subscribe: { bindings: OPERATION_BAD } } } }],
  ["inline operation trait", "channels.c.publish.traits.0.bindings.ros2", OPERATION_FINDING, { channels: { c: { publish: { traits: [{ bindings: OPERATION_BAD }] } } } }],
  [
    "referenced operation trait",
    "channels.c.publish.traits.0",
    OPERATION_FINDING,
    { channels: { c: { publish: { traits: [{ $ref: "#/components/operationTraits/t" }] } } }, components: { operationTraits: { t: { bindings: OPERATION_BAD } } } },
  ],
  ["publish message", "channels.c.publish.message.bindings.googlepubsub.schema", MESSAGE_FINDING, { channels: { c: { publish: { message: { bindings: MESSAGE_BAD } } } } }],
  ["subscribe message", "channels.c.subscribe.message.bindings.googlepubsub.schema", MESSAGE_FINDING, { channels: { c: { subscribe: { message: { bindings: MESSAGE_BAD } } } } }],
  ["oneOf member", "channels.c.publish.message.oneOf.0.bindings.googlepubsub.schema", MESSAGE_FINDING, { channels: { c: { publish: { message: { oneOf: [{ bindings: MESSAGE_BAD }] } } } } }],
  ["inline message trait", "channels.c.publish.message.traits.0.bindings.googlepubsub.schema", MESSAGE_FINDING, { channels: { c: { publish: { message: { traits: [{ bindings: MESSAGE_BAD }] } } } } }],
  ["tuple message trait", "channels.c.publish.message.traits.0.0.bindings.googlepubsub.schema", MESSAGE_FINDING, { channels: { c: { publish: { message: { traits: [[{ bindings: MESSAGE_BAD }, {}]] } } } } }],
  [
    "referenced message trait",
    "channels.c.publish.message.traits.0",
    MESSAGE_FINDING,
    { channels: { c: { publish: { message: { traits: [{ $ref: "#/components/messageTraits/t" }] } } } }, components: { messageTraits: { t: { bindings: MESSAGE_BAD } } } },
  ],
  [
    "referenced tuple message trait",
    "channels.c.publish.message.traits.0.0",
    MESSAGE_FINDING,
    { channels: { c: { publish: { message: { traits: [[{ $ref: "#/components/messageTraits/t" }, {}]] } } } }, components: { messageTraits: { t: { bindings: MESSAGE_BAD } } } },
  ],
  [
    "oneOf member trait",
    "channels.c.publish.message.oneOf.0.traits.0.bindings.googlepubsub.schema",
    MESSAGE_FINDING,
    { channels: { c: { publish: { message: { oneOf: [{ traits: [{ bindings: MESSAGE_BAD }] }] } } } } },
  ],
  ["components.servers", "components.servers.s.bindings.jms", SERVER_FINDING, { components: { servers: { s: { url: "tcp://mq:61616", protocol: "jms", bindings: SERVER_BAD } } } }],
  ["components.channels", "components.channels.c.bindings.pulsar", CHANNEL_FINDING, { components: { channels: { c: { bindings: CHANNEL_BAD } } } }],
  ["components.channels operation", "components.channels.c.subscribe.bindings.ros2", OPERATION_FINDING, { components: { channels: { c: { subscribe: { bindings: OPERATION_BAD } } } } }],
  [
    "components.channels operation trait",
    "components.channels.c.subscribe.traits.0.bindings.ros2",
    OPERATION_FINDING,
    { components: { channels: { c: { subscribe: { traits: [{ bindings: OPERATION_BAD }] } } } } },
  ],
  [
    "components.channels message",
    "components.channels.c.subscribe.message.bindings.googlepubsub.schema",
    MESSAGE_FINDING,
    { components: { channels: { c: { subscribe: { message: { bindings: MESSAGE_BAD } } } } } },
  ],
  ["components.messages", "components.messages.m.bindings.googlepubsub.schema", MESSAGE_FINDING, { components: { messages: { m: { bindings: MESSAGE_BAD } } } }],
  ["components.messages oneOf", "components.messages.m.oneOf.0.bindings.googlepubsub.schema", MESSAGE_FINDING, { components: { messages: { m: { oneOf: [{ bindings: MESSAGE_BAD }] } } } }],
  ["components.messages trait", "components.messages.m.traits.0.bindings.googlepubsub.schema", MESSAGE_FINDING, { components: { messages: { m: { traits: [{ bindings: MESSAGE_BAD }] } } } }],
  ["components.serverBindings", "components.serverBindings.b.jms", SERVER_FINDING, { components: { serverBindings: { b: SERVER_BAD } } }],
  ["components.channelBindings", "components.channelBindings.b.pulsar", CHANNEL_FINDING, { components: { channelBindings: { b: CHANNEL_BAD } } }],
  ["components.operationBindings", "components.operationBindings.b.ros2", OPERATION_FINDING, { components: { operationBindings: { b: OPERATION_BAD } } }],
  ["components.messageBindings", "components.messageBindings.b.googlepubsub.schema", MESSAGE_FINDING, { components: { messageBindings: { b: MESSAGE_BAD } } }],
];

const PROBE = base({
  servers: { probe: { url: "tcp://probe:61616", protocol: "jms", bindings: { jms: { replicas: 1, clientID: "probe" } } } },
  channels: { probe: { bindings: { kafka: REQUIRED_BINDING_CASES.probe } } },
});
const PROBE_FALLBACK = [finding("servers.probe.bindings.jms", "Server", "jms", "jmsConnectionFactory")];

describe("AAR069 (AsyncAPI 2.x): protocol bindings must declare their required fields", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped required_binding_props", () => {
    test("passes a realistic document whose bindings declare every required field, directly, through traits or through $ref definitions", async () => {
      expect(findings(await linter.run(okExample))).toEqual([]);
    });

    test("reports every missing field in servers, channels, operations, messages, traits and every components map", async () => {
      expect(findings(await linter.run(failExample))).toEqual(FAIL_EXAMPLE);
    });

    test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports the same findings on AsyncAPI %s", async (version) => {
      expect(findings(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      expect(findings(await linter.run(withVersion(okExample, version)))).toEqual([]);
    });

    test("treats a version that is not 3.x as 2.x", async () => {
      for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", null]) {
        expect(findings(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
      }
    });

    test("every finding is an error carrying the AAR069 prefix", async () => {
      const results = only(await linter.run(failExample));
      expect(results).toHaveLength(FAIL_EXAMPLE.length);
      results.forEach((r) => {
        expect(r.severity).toBe(0);
        expect(r.message.startsWith("AAR069: ")).toBe(true);
      });
    });

    test("a document holding a complete binding of every protocol with required fields passes", async () => {
      const doc = base({ components: {} });
      for (const [kind, protocols] of Object.entries(REQUIRED_BINDING_CASES.complete)) {
        setAt(doc, HOLDERS[kind], clone(protocols));
      }
      expect(findings(await linter.run(doc))).toEqual([]);
    });

    test("an empty binding of every protocol reports exactly the top-level required fields of each kind", async () => {
      const empty = Object.fromEntries(BINDING_KEY_CASES.allowed.map((protocol) => [protocol, {}]));
      const doc = base();
      Object.keys(HOLDERS).forEach((kind) => setAt(doc, HOLDERS[kind], clone(empty)));
      expect(findings(await linter.run(doc))).toEqual(
        [
          finding("servers.probe.bindings.jms", "Server", "jms", "jmsConnectionFactory"),
          finding("channels.probe.bindings.amqp", "Channel", "amqp", "exchange", "queue"),
          finding("channels.probe.bindings.googlepubsub", "Channel", "googlepubsub", "schemaSettings"),
          finding("channels.probe.bindings.pulsar", "Channel", "pulsar", "namespace"),
          finding("channels.probe.bindings.pulsar", "Channel", "pulsar", "persistence"),
          finding("channels.probe.bindings.sns", "Channel", "sns", "name"),
          finding("channels.probe.bindings.sqs", "Channel", "sqs", "queue"),
          finding("channels.probe.publish.bindings.ros2", "Operation", "ros2", "role"),
          finding("channels.probe.publish.bindings.ros2", "Operation", "ros2", "node"),
          finding("channels.probe.publish.bindings.sns", "Operation", "sns", "consumers"),
          finding("channels.probe.publish.bindings.sqs", "Operation", "sqs", "queues"),
        ].sort()
      );
    });

    test.each(REQUIRED_BINDING_CASES.defaults.map((entry) => [`${entry[0]}.${entry[1]}.${render(entry[2])}`, entry]))(
      "reports %s when it is missing, on the object that should hold it",
      async (_, entry) => {
        const [kind, protocol, steps] = entry;
        const doc = placeBindings(kind, { [protocol]: removeAt(completeBinding(kind, protocol), steps) });
        expect(findings(await linter.run(doc))).toEqual([finding(parentPath(entry), LABELS[kind], protocol, ...fieldsOf(entry))]);
      }
    );

    test.each(REQUIRED_BINDING_CASES.defaults.map((entry) => [`${entry[0]}.${entry[1]}.${render(entry[2])}`, entry]))(
      "accepts false, 0, empty lists and objects, padded strings and $ref values for %s",
      async (_, entry) => {
        const [kind, protocol, steps] = entry;
        const own = message(LABELS[kind], protocol, ...fieldsOf(entry));
        for (const value of REQUIRED_BINDING_CASES.presentValues) {
          const doc = placeBindings(kind, { [protocol]: setAt(completeBinding(kind, protocol), steps, clone(value)) });
          expect([value, only(await linter.run(doc)).filter((r) => r.message === own)]).toEqual([value, []]);
        }
      }
    );

    test.each(REQUIRED_BINDING_CASES.defaults.map((entry) => [`${entry[0]}.${entry[1]}.${render(entry[2])}`, entry]))(
      "treats null, empty and blank strings as missing for %s",
      async (_, entry) => {
        const [kind, protocol, steps] = entry;
        for (const value of REQUIRED_BINDING_CASES.missingValues) {
          const doc = placeBindings(kind, { [protocol]: setAt(completeBinding(kind, protocol), steps, value) });
          expect([value, findings(await linter.run(doc))]).toEqual([value, [finding(parentPath(entry), LABELS[kind], protocol, ...fieldsOf(entry))]]);
        }
      }
    );

    test.each(REQUIRED_BINDING_CASES.optionalParents.map((entry) => [`${entry[0]}.${entry[1]}.${render(entry[2])}`, entry]))(
      "requires nothing below %s when that optional object is absent",
      async (_, [kind, protocol, steps]) => {
        const doc = placeBindings(kind, { [protocol]: removeAt(completeBinding(kind, protocol), steps) });
        expect(findings(await linter.run(doc))).toEqual([]);
      }
    );

    test("a required parent that is missing is reported once, without its nested fields", async () => {
      const doc = base({
        channels: { c: { bindings: { sqs: {}, googlepubsub: {}, sns: { name: "n", policy: { statements: null } } }, publish: { bindings: { sns: {}, sqs: { queues: null } } } } },
      });
      expect(findings(await linter.run(doc))).toEqual(
        [
          finding("channels.c.bindings.sqs", "Channel", "sqs", "queue"),
          finding("channels.c.bindings.googlepubsub", "Channel", "googlepubsub", "schemaSettings"),
          finding("channels.c.bindings.sns.policy", "Channel", "sns", "policy.statements"),
          finding("channels.c.publish.bindings.sns", "Operation", "sns", "consumers"),
          finding("channels.c.publish.bindings.sqs", "Operation", "sqs", "queues"),
        ].sort()
      );
    });

    test("checks a nested requirement in every item of a list, naming the item index", async () => {
      const consumers = [
        { protocol: "sqs", endpoint: { name: "a" }, rawMessageDelivery: true },
        { endpoint: { name: "b" }, rawMessageDelivery: false },
        { protocol: "sqs", endpoint: { name: "c" }, rawMessageDelivery: true },
        { protocol: "email" },
      ];
      const doc = base({ channels: { c: { publish: { bindings: { sns: { consumers } } } } } });
      expect(findings(await linter.run(doc))).toEqual(
        [
          finding("channels.c.publish.bindings.sns.consumers.1", "Operation", "sns", "consumers[1].protocol"),
          finding("channels.c.publish.bindings.sns.consumers.3", "Operation", "sns", "consumers[3].endpoint"),
          finding("channels.c.publish.bindings.sns.consumers.3", "Operation", "sns", "consumers[3].rawMessageDelivery"),
        ].sort()
      );
    });

    test("treats a protocol declared without a value as an empty binding", async () => {
      const doc = base({
        servers: { s: { url: "tcp://mq:61616", protocol: "jms", bindings: { jms: null } } },
        channels: {
          c: {
            bindings: { pulsar: null, sqs: null, sns: null, googlepubsub: null, amqp: null, ibmmq: null },
            publish: { bindings: { ros2: null, sns: null, sqs: null }, message: { bindings: { googlepubsub: null } } },
          },
        },
      });
      expect(findings(await linter.run(doc))).toEqual(
        [
          finding("servers.s.bindings.jms", "Server", "jms", "jmsConnectionFactory"),
          finding("channels.c.bindings.pulsar", "Channel", "pulsar", "namespace"),
          finding("channels.c.bindings.pulsar", "Channel", "pulsar", "persistence"),
          finding("channels.c.bindings.sqs", "Channel", "sqs", "queue"),
          finding("channels.c.bindings.sns", "Channel", "sns", "name"),
          finding("channels.c.bindings.googlepubsub", "Channel", "googlepubsub", "schemaSettings"),
          finding("channels.c.bindings.amqp", "Channel", "amqp", "exchange", "queue"),
          finding("channels.c.publish.bindings.ros2", "Operation", "ros2", "role"),
          finding("channels.c.publish.bindings.ros2", "Operation", "ros2", "node"),
          finding("channels.c.publish.bindings.sns", "Operation", "sns", "consumers"),
          finding("channels.c.publish.bindings.sqs", "Operation", "sqs", "queues"),
        ].sort()
      );
    });

    test("skips protocol values and parents that are not objects, x- keys, and keys that differ in case from the protocol", async () => {
      const doc = base({
        servers: { s: { url: "tcp://mq:61616", protocol: "jms", bindings: { jms: "factory", JMS: {}, "x-jms": {} } } },
        channels: {
          c: {
            bindings: { pulsar: "persistent", sqs: [], sns: true, amqp: 0, Pulsar: {}, " pulsar": {}, "x-pulsar": {}, ibmmq: { queue: "ORDERS.IN" } },
            publish: { bindings: { ros2: ["publisher"], ROS2: {}, sqs: { queues: [null, "orders", 3, [{}]] } } },
          },
        },
      });
      expect(findings(await linter.run(doc))).toEqual([]);
    });

    test("applies each requirement only to bindings of its own kind", async () => {
      const doc = base({
        servers: { s: { url: "tcp://mq:61616", protocol: "pulsar", bindings: { pulsar: {}, sqs: {}, ros2: {}, googlepubsub: { schema: {} } } } },
        channels: { c: { bindings: { jms: {}, ros2: {} }, publish: { bindings: { jms: {}, pulsar: {}, googlepubsub: { schema: {} } }, message: { bindings: { jms: {}, sqs: {}, pulsar: {}, ros2: {} } } } } },
      });
      expect(findings(await linter.run(doc))).toEqual([]);
    });

    test.each(LOCATIONS)("reports a %s binding with its kind and the exact path", async (_, path, [kind, protocol, field], extra) => {
      const results = only(await linter.run(base(extra)));
      expect(results.map((r) => [r.path.join("."), r.message])).toEqual([[path, message(kind, protocol, field)]]);
    });

    test("never checks message and operation trait definitions on their own, since a trait only completes a message or operation", async () => {
      const doc = base({ components: { messageTraits: { t: { bindings: MESSAGE_BAD } }, operationTraits: { t: { bindings: OPERATION_BAD }, u: { bindings: { sns: {} } } } } });
      expect(findings(await linter.run(doc))).toEqual([]);
    });

    test("merges traits as AsyncAPI 2.x does: a trait completes or overrides the message or operation, and lists are replaced whole", async () => {
      expect(findings(await linter.run(failTraitsMerge))).toEqual(TRAITS_MERGE);
    });

    test("validates a shared server, channel, message or bindings object once at its definition, and skips external, dangling and $ref values", async () => {
      expect(findings(await linter.run(failSharedRef))).toEqual(SHARED_REF);
    });

    test("skips null, scalar and array nodes, malformed traits, 3.x-only structures, schemas, examples and extensions", async () => {
      expect(findings(await linter.run(okStructuralEdges))).toEqual([]);
    });

    test("validates servers, channels and messages whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({
        servers: { "x-edge": { url: "tcp://mq:61616", protocol: "jms", bindings: SERVER_BAD } },
        channels: { "x-internal": { bindings: CHANNEL_BAD, publish: { message: { bindings: MESSAGE_BAD } } } },
        components: { messages: { "x-legacy": { bindings: MESSAGE_BAD } }, serverBindings: { "x-shared": SERVER_BAD } },
      });
      expect(findings(await linter.run(doc))).toEqual(
        [
          finding("servers.x-edge.bindings.jms", ...SERVER_FINDING),
          finding("channels.x-internal.bindings.pulsar", ...CHANNEL_FINDING),
          finding("channels.x-internal.publish.message.bindings.googlepubsub.schema", ...MESSAGE_FINDING),
          finding("components.messages.x-legacy.bindings.googlepubsub.schema", ...MESSAGE_FINDING),
          finding("components.serverBindings.x-shared.jms", ...SERVER_FINDING),
        ].sort()
      );
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("2.6.0");
      expect(findings(await linter.run(withoutVersion))).toEqual([]);
    });

    test("returns no results for non-object documents", async () => {
      expect(findings(await linter.run("42"))).toEqual([]);
      expect(findings(await linter.run([base({ servers: { s: { bindings: SERVER_BAD } } })]))).toEqual([]);
    });

    test("handles a very large document and reports exactly the generated violations", async () => {
      expect(findings(await linter.run(failLargeGenerated.document))).toEqual(failLargeGenerated.expected);
    });
  });

  describe("configured required_binding_props", () => {
    test.each(REQUIRED_BINDING_CASES.usableMissing)("%p requires a field the probe binding lacks", async (entry, field) => {
      const configured = await withOptions(entry);
      const path = field.startsWith("'topicConfiguration") ? "channels.probe.bindings.kafka.topicConfiguration" : "channels.probe.bindings.kafka";
      expect(findings(await configured.run(PROBE))).toEqual([`${path} :: AAR069: Channel binding 'kafka' must declare ${field}.`]);
    });

    test.each(REQUIRED_BINDING_CASES.usableSatisfied)("%p is a usable entry the probe document satisfies", async (entry) => {
      const configured = await withOptions(entry);
      expect(findings(await configured.run(PROBE))).toEqual([]);
    });

    test.each(REQUIRED_BINDING_CASES.unusable)("%p is ignored, so a list made only of it falls back to the shipped requirements", async (entry) => {
      const configured = await withOptions(entry);
      expect(findings(await configured.run(PROBE))).toEqual(PROBE_FALLBACK);
    });

    test.each(REQUIRED_BINDING_CASES.fallbackValues.map((value) => [value]))("falls back to the shipped requirements when required_binding_props is %p", async (value) => {
      const configured = await withOptions(value);
      expect(findings(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findings(await configured.run(okExample))).toEqual([]);
      expect(findings(await configured.run(PROBE))).toEqual(PROBE_FALLBACK);
    });

    test("the shipped YAML list and the function's own fallback list hold the same requirements", async () => {
      const doc = base({ channels: {} });
      const homes = { server: (i) => ["servers", `s${i}`, "bindings"], channel: (i) => ["channels", `c${i}`, "bindings"], operation: (i) => ["channels", `o${i}`, "publish", "bindings"], message: (i) => ["channels", `m${i}`, "publish", "message", "bindings"] };
      REQUIRED_BINDING_CASES.defaults.forEach(([kind, protocol, steps], index) => {
        setAt(doc, homes[kind](index), { [protocol]: removeAt(completeBinding(kind, protocol), steps) });
      });
      const shipped = findings(await linter.run(doc));
      const fallback = findings(await (await withOptions("kafka")).run(doc));
      expect(shipped).toHaveLength(REQUIRED_BINDING_CASES.defaults.length);
      expect(fallback).toEqual(shipped);
    });

    test("a configured list replaces the shipped one instead of extending it", async () => {
      const configured = await withOptions("channel.kafka.replicas");
      expect(findings(await configured.run(failExample))).toEqual([]);
      expect(findings(await configured.run(PROBE))).toEqual([finding("channels.probe.bindings.kafka", "Channel", "kafka", "replicas")]);
    });

    test("ignores the unusable entries of a list and applies the usable ones", async () => {
      const configured = await withOptions("channel.kafka.replicas, kafka, channels.kafka.topic, channel.x-kafka.topic, channel.kafka.[broken, server.jms.clientID");
      expect(findings(await configured.run(PROBE))).toEqual([finding("channels.probe.bindings.kafka", "Channel", "kafka", "replicas")]);
    });

    test("accepts an array, entries carrying commas, duplicates and mixed case, and ignores non-string items", async () => {
      const expected = [
        finding("channels.probe.bindings.kafka", "Channel", "kafka", "replicas"),
        finding("servers.probe.bindings.jms", "Server", "jms", "jmsConnectionFactory"),
      ].sort();
      for (const value of [
        ["channel.kafka.replicas", "server.jms.jmsConnectionFactory"],
        ["channel.kafka.replicas,server.jms.jmsConnectionFactory"],
        ["CHANNEL.Kafka.replicas", 42, null, { value: "channel.kafka.topic" }, " Server.JMS.jmsConnectionFactory "],
        "channel.kafka.replicas, channel.kafka.replicas, *.kafka.replicas, channel.*.replicas, server.jms.jmsConnectionFactory, *.jms.jmsConnectionFactory",
      ]) {
        const configured = await withOptions(value);
        expect([value, findings(await configured.run(PROBE))]).toEqual([value, expected]);
      }
    });

    test("wildcards select every kind, every protocol or both, never x- extensions", async () => {
      const doc = base({
        servers: { s: { url: "tcp://mq:61616", protocol: "jms", bindings: { jms: {}, kafka: { bindingVersion: "0.5.0" }, "x-team": {} } } },
        channels: {
          c: {
            bindings: { kafka: {}, pulsar: { bindingVersion: "0.1.0" }, Kafka: {}, "x-retention": {} },
            publish: { bindings: { ros2: {} }, message: { bindings: { googlepubsub: {}, kafka: { bindingVersion: "0.5.0" } } } },
          },
        },
      });
      const run = async (value) => findings(await (await withOptions(value)).run(doc));
      const version = (path, kind, protocol) => finding(path, kind, protocol, "bindingVersion");
      expect(await run("*.*.bindingVersion")).toEqual(
        [
          version("servers.s.bindings.jms", "Server", "jms"),
          version("channels.c.bindings.kafka", "Channel", "kafka"),
          version("channels.c.bindings.Kafka", "Channel", "Kafka"),
          version("channels.c.publish.bindings.ros2", "Operation", "ros2"),
          version("channels.c.publish.message.bindings.googlepubsub", "Message", "googlepubsub"),
        ].sort()
      );
      expect(await run("server.*.bindingVersion")).toEqual([version("servers.s.bindings.jms", "Server", "jms")]);
      expect(await run("*.kafka.bindingVersion")).toEqual([version("channels.c.bindings.kafka", "Channel", "kafka")]);
      expect(await run("channel.*.bindingVersion")).toEqual([version("channels.c.bindings.kafka", "Channel", "kafka"), version("channels.c.bindings.Kafka", "Channel", "Kafka")].sort());
      expect(await run("message.*.bindingVersion, operation.*.bindingVersion")).toEqual(
        [version("channels.c.publish.bindings.ros2", "Operation", "ros2"), version("channels.c.publish.message.bindings.googlepubsub", "Message", "googlepubsub")].sort()
      );
    });

    test("an alternative is satisfied by any of its fields, and the same field required alone is still reported", async () => {
      const doc = base({ channels: { c: { bindings: { amqp: { is: "queue", queue: { name: "orders" } } } } } });
      const run = async (value) => findings(await (await withOptions(value)).run(doc));
      expect(await run("channel.amqp.exchange|queue")).toEqual([]);
      expect(await run("channel.amqp.exchange|queue, channel.amqp.exchange")).toEqual([finding("channels.c.bindings.amqp", "Channel", "amqp", "exchange")]);
      expect(await run("channel.amqp.exchange|bindingVersion")).toEqual([finding("channels.c.bindings.amqp", "Channel", "amqp", "exchange", "bindingVersion")]);
      expect(await run("channel.amqp.queue.durable|exclusive|autoDelete")).toEqual([finding("channels.c.bindings.amqp.queue", "Channel", "amqp", "queue.durable", "queue.exclusive", "queue.autoDelete")]);
      expect(await run("channel.amqp.queue.name|durable")).toEqual([]);
    });

    test("a key containing dots must go between brackets: without them it is read as a nested path whose parent is absent", async () => {
      const doc = base({ channels: { c: { bindings: { kafka: { topicConfiguration: { "cleanup.policy": ["delete"] } } } } } });
      const run = async (value) => findings(await (await withOptions(value)).run(doc));
      const retention = finding("channels.c.bindings.kafka.topicConfiguration", "Channel", "kafka", "topicConfiguration[retention.ms]");
      expect(await run("channel.kafka.topicConfiguration[retention.ms]")).toEqual([retention]);
      expect(await run("channel.kafka.topicConfiguration.[retention.ms]")).toEqual([retention]);
      expect(await run("channel.kafka.topicConfiguration.retention.ms")).toEqual([]);
      expect(await run("channel.kafka.topicConfiguration[cleanup.policy]")).toEqual([]);
      expect(await run("channel.kafka.topicConfiguration.cleanup.policy")).toEqual([]);
    });

    test("a nested entry never requires its parent, and a parent entry never requires its children", async () => {
      const doc = base({ channels: { c: { bindings: { sqs: { deadLetterQueue: {} } }, publish: { bindings: { sns: { consumers: [] } } } } } });
      const run = async (value) => findings(await (await withOptions(value)).run(doc));
      expect(await run("channel.sqs.queue.name")).toEqual([]);
      expect(await run("channel.sqs.deadLetterQueue")).toEqual([]);
      expect(await run("channel.sqs.deadLetterQueue.name")).toEqual([finding("channels.c.bindings.sqs.deadLetterQueue", "Channel", "sqs", "deadLetterQueue.name")]);
      expect(await run("operation.sns.consumers.protocol")).toEqual([]);
      expect(await run("operation.sns.consumers")).toEqual([]);
    });

    test("protocols outside the specification and protocols containing dots can be required", async () => {
      const doc = base({ channels: { c: { bindings: { rabbitmq: { exchange: "orders" }, "kafka.v2": {}, Kafka: {} } } } });
      const run = async (value) => findings(await (await withOptions(value)).run(doc));
      expect(await run("channel.rabbitmq.vhost")).toEqual([finding("channels.c.bindings.rabbitmq", "Channel", "rabbitmq", "vhost")]);
      expect(await run("channel.RabbitMQ.exchange")).toEqual([]);
      expect(await run("channel.[kafka.v2].topic")).toEqual([finding("channels.c.bindings.kafka.v2", "Channel", "kafka.v2", "topic")]);
      expect(await run("channel.kafka.topic")).toEqual([]);
    });

    test("a field whose name contains dots is rendered between brackets in the message", async () => {
      const doc = base({ channels: { c: { bindings: { kafka: { topicConfiguration: {} } } } } });
      const configured = await withOptions("channel.kafka.[topicConfiguration].[confluent.value.schema.validation]|[confluent.key.schema.validation]");
      expect(findings(await configured.run(doc))).toEqual([
        finding(
          "channels.c.bindings.kafka.topicConfiguration",
          "Channel",
          "kafka",
          "topicConfiguration[confluent.value.schema.validation]",
          "topicConfiguration[confluent.key.schema.validation]"
        ),
      ]);
    });

    test("a Kafka governance profile checks topics, consumer groups and message keys of a realistic document", async () => {
      const configured = await withOptions(
        "channel.kafka.topic, channel.kafka.partitions, channel.kafka.replicas, channel.kafka.topicConfiguration[retention.ms], operation.kafka.groupId, message.kafka.key, server.kafka.schemaRegistryUrl"
      );
      expect(findings(await configured.run(okExample))).toEqual([finding("channels.inventory.adjusted.bindings.kafka", "Channel", "kafka", "replicas")]);
    });

    test("configured requirements merge traits and follow $ref definitions exactly as the shipped ones", async () => {
      const configured = await withOptions("operation.ros2.node, operation.ros2.qosPolicies, message.googlepubsub.orderingKey");
      expect(findings(await configured.run(okExample))).toEqual(
        [
          finding("channels.fleet/{vehicleId}/commands.publish.bindings.ros2", "Operation", "ros2", "qosPolicies"),
          finding("components.channels.auditTrail.publish.message.bindings.googlepubsub", "Message", "googlepubsub", "orderingKey"),
          finding("components.messages.shipmentEvents.oneOf.0.bindings.googlepubsub", "Message", "googlepubsub", "orderingKey"),
          finding("components.messages.inventoryAdjusted.bindings.googlepubsub", "Message", "googlepubsub", "orderingKey"),
          finding("components.operationBindings.snsFanout.ros2", "Operation", "ros2", "qosPolicies"),
        ].sort()
      );
    });
  });
});
