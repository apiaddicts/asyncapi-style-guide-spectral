const { linterForRule, BINDING_KEY_CASES, REQUIRED_BINDING_CASES } = require("../../helpers/utils");
const okExample = require("./AAR069/ok-example");
const failExample = require("./AAR069/fail-example");
const failTraitsMerge = require("./AAR069/fail-traits-merge");
const failSharedRef = require("./AAR069/fail-shared-ref");
const okStructuralEdges = require("./AAR069/ok-structural-edges");
const failLargeGenerated = require("./AAR069/fail-large-generated");

const RULE = "asa:AAR069";
const VERSIONS = ["3.0.0", "3.1.0"];
const C1 = "channels.shipmentDispatched";
const C2 = "channels.temperatureReadings";
const O1 = "operations.publishShipmentDispatched";
const LABELS = { server: "Server", channel: "Channel", operation: "Operation", message: "Message" };
const HOLDERS = {
  server: ["servers", "probe", "bindings"],
  channel: ["channels", "probe", "bindings"],
  operation: ["operations", "probe", "bindings"],
  message: ["channels", "probe", "messages", "probe", "bindings"],
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
const base = (extra, version = "3.0.0") => ({ asyncapi: version, info: { title: "Required Binding Fields", version: "1.0.0" }, ...extra });

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
const placeBindings = (kind, bindings, version) => setAt(base({}, version), HOLDERS[kind], bindings);
const completeBinding = (kind, protocol) => clone(REQUIRED_BINDING_CASES.complete[kind][protocol]);
const fieldsOf = ([, , steps, alternatives]) => alternatives || [render(steps)];
const parentPath = ([kind, protocol, steps]) => [...HOLDERS[kind], protocol, ...steps.slice(0, -1)].join(".");
const caseName = (entry) => [`${entry[0]}.${entry[1]}.${render(entry[2])}`, entry];

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
  finding(`${C1}.messages.shipmentDispatchedLegacy.bindings.googlepubsub.schema`, "Message", "googlepubsub", "schema.name"),
  finding(`${C1}.messages.shipmentDispatchedTuple.traits.0.0.bindings.googlepubsub.schema`, "Message", "googlepubsub", "schema.name"),
  finding(`${C2}.bindings.googlepubsub`, "Channel", "googlepubsub", "schemaSettings"),
  finding(`${C2}.bindings.ibmmq.queue`, "Channel", "ibmmq", "queue.objectName"),
  finding(`${C2}.bindings.pulsar`, "Channel", "pulsar", "namespace"),
  finding(`${C2}.bindings.pulsar`, "Channel", "pulsar", "persistence"),
  finding(`${O1}.bindings.sns.consumers.0`, "Operation", "sns", "consumers[0].rawMessageDelivery"),
  finding(`${O1}.bindings.sns.consumers.1.redrivePolicy`, "Operation", "sns", "consumers[1].redrivePolicy.deadLetterQueue"),
  finding(`${O1}.traits.1.bindings.ros2`, "Operation", "ros2", "role"),
  finding(`${O1}.traits.0`, "Operation", "sqs", "queues[1].name"),
  finding(`${O1}.traits.0`, "Operation", "sqs", "queues[1].redrivePolicy.deadLetterQueue"),
  finding("operations.receiveShipmentDispatched.bindings.ros2", "Operation", "ros2", "node"),
  finding("operations.receiveTemperature.bindings.sqs.queues.0.policy.statements.1", "Operation", "sqs", "queues[0].policy.statements[1].effect"),
  finding("operations.receiveTemperature.bindings.sqs.queues.0.policy.statements.1", "Operation", "sqs", "queues[0].policy.statements[1].principal"),
  finding("operations.receiveTemperature.bindings.sqs.queues.0.policy.statements.1", "Operation", "sqs", "queues[0].policy.statements[1].action"),
  finding("components.servers.drJms.bindings.jms", "Server", "jms", "jmsConnectionFactory"),
  finding("components.channels.auditTrail.bindings.pulsar", "Channel", "pulsar", "persistence"),
  finding("components.channels.auditTrail.messages.auditEntry.bindings.googlepubsub.schema", "Message", "googlepubsub", "schema.name"),
  finding("components.operations.publishAudit.bindings.sns", "Operation", "sns", "consumers"),
  finding("components.messages.shipmentEvents.bindings.googlepubsub.schema", "Message", "googlepubsub", "schema.name"),
  finding("components.serverBindings.jmsShared.jms", "Server", "jms", "jmsConnectionFactory"),
  finding("components.serverBindings.jmsShared.jms.properties.0", "Server", "jms", "properties[0].value"),
  finding("components.channelBindings.sqsInvoices.sqs", "Channel", "sqs", "queue"),
  finding("components.operationBindings.snsFanout.ros2", "Operation", "ros2", "role"),
  finding("components.operationBindings.snsFanout.ros2", "Operation", "ros2", "node"),
  finding("components.messageBindings.pubsubKeyed.googlepubsub.schema", "Message", "googlepubsub", "schema.name"),
].sort();

const TRAITS_MERGE = [
  finding("operations.traitOrderLast.traits.1.bindings.sns.consumers.0", "Operation", "sns", "consumers[0].endpoint"),
  finding("operations.traitOrderLast.traits.1.bindings.sns.consumers.0", "Operation", "sns", "consumers[0].rawMessageDelivery"),
  finding("operations.blankPublish.bindings.ros2", "Operation", "ros2", "role"),
  finding("operations.traitOnly.traits.0", "Operation", "sns", "consumers[0].endpoint"),
  finding("operations.traitOnly.traits.0", "Operation", "sns", "consumers[0].rawMessageDelivery"),
  finding("components.operationBindings.rosRole.ros2", "Operation", "ros2", "node"),
  finding("operations.emptyDefinition.bindings.ros2", "Operation", "ros2", "role"),
  finding("operations.tupleOperation.bindings.ros2", "Operation", "ros2", "role"),
  finding("operations.tupleOperation.bindings.ros2", "Operation", "ros2", "node"),
  ...["protocol", "endpoint", "rawMessageDelivery"].flatMap((field) => [
    finding("operations.escaped.traits.0", "Operation", "sns", `consumers[0].${field}`),
    finding("operations.escapedPercent.traits.0", "Operation", "sns", `consumers[0].${field}`),
  ]),
  finding("operations.escapedTilde.traits.0", "Operation", "ros2", "node"),
  finding("channels.gates.messages.gateClosed.traits.0.0", "Message", "googlepubsub", "schema.name"),
  finding("channels.gates.messages.gateJammed.traits.0", "Message", "googlepubsub", "schema.name"),
  finding("channels.gates.messages.gateRestored.bindings.googlepubsub.schema", "Message", "googlepubsub", "schema.name"),
].sort();

const SHARED_REF = [
  finding("components.servers.drJms.bindings.jms", "Server", "jms", "jmsConnectionFactory"),
  finding("components.serverBindings.jmsChainEnd.jms", "Server", "jms", "jmsConnectionFactory"),
  finding("components.serverBindings.jmsChainEnd.jms.properties.0", "Server", "jms", "properties[0].value"),
  finding("components.channels.telemetry.bindings.pulsar", "Channel", "pulsar", "persistence"),
  finding("components.messages.positionReported.bindings.googlepubsub.schema", "Message", "googlepubsub", "schema.name"),
  finding("components.operations.sharedOp.bindings.ros2", "Operation", "ros2", "node"),
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
const channelRef = { $ref: "#/channels/c" };

const LOCATIONS = [
  ["server", "servers.s.bindings.jms", SERVER_FINDING, { servers: { s: { host: "mq:61616", protocol: "jms", bindings: SERVER_BAD } } }],
  ["channel", "channels.c.bindings.pulsar", CHANNEL_FINDING, { channels: { c: { address: "yard.events", bindings: CHANNEL_BAD } } }],
  ["channel whose address is null", "channels.c.bindings.pulsar", CHANNEL_FINDING, { channels: { c: { address: null, bindings: CHANNEL_BAD } } }],
  ["send operation", "operations.o.bindings.ros2", OPERATION_FINDING, { operations: { o: { action: "send", channel: channelRef, bindings: OPERATION_BAD } } }],
  ["receive operation", "operations.o.bindings.ros2", OPERATION_FINDING, { operations: { o: { action: "receive", channel: channelRef, bindings: OPERATION_BAD } } }],
  ["inline operation trait", "operations.o.traits.0.bindings.ros2", OPERATION_FINDING, { operations: { o: { action: "send", traits: [{ bindings: OPERATION_BAD }] } } }],
  [
    "referenced operation trait",
    "operations.o.traits.0",
    OPERATION_FINDING,
    { operations: { o: { action: "send", traits: [{ $ref: "#/components/operationTraits/t" }] } }, components: { operationTraits: { t: { bindings: OPERATION_BAD } } } },
  ],
  ["channel message", "channels.c.messages.m.bindings.googlepubsub.schema", MESSAGE_FINDING, { channels: { c: { messages: { m: { bindings: MESSAGE_BAD } } } } }],
  ["inline message trait", "channels.c.messages.m.traits.0.bindings.googlepubsub.schema", MESSAGE_FINDING, { channels: { c: { messages: { m: { traits: [{ bindings: MESSAGE_BAD }] } } } } }],
  ["tuple message trait", "channels.c.messages.m.traits.0.0.bindings.googlepubsub.schema", MESSAGE_FINDING, { channels: { c: { messages: { m: { traits: [[{ bindings: MESSAGE_BAD }, {}]] } } } } }],
  [
    "referenced message trait",
    "channels.c.messages.m.traits.0",
    MESSAGE_FINDING,
    { channels: { c: { messages: { m: { traits: [{ $ref: "#/components/messageTraits/t" }] } } } }, components: { messageTraits: { t: { bindings: MESSAGE_BAD } } } },
  ],
  [
    "referenced tuple message trait",
    "channels.c.messages.m.traits.0.0",
    MESSAGE_FINDING,
    { channels: { c: { messages: { m: { traits: [[{ $ref: "#/components/messageTraits/t" }, {}]] } } } }, components: { messageTraits: { t: { bindings: MESSAGE_BAD } } } },
  ],
  ["components.servers", "components.servers.s.bindings.jms", SERVER_FINDING, { components: { servers: { s: { host: "mq:61616", protocol: "jms", bindings: SERVER_BAD } } } }],
  ["components.channels", "components.channels.c.bindings.pulsar", CHANNEL_FINDING, { components: { channels: { c: { bindings: CHANNEL_BAD } } } }],
  ["components.channels message", "components.channels.c.messages.m.bindings.googlepubsub.schema", MESSAGE_FINDING, { components: { channels: { c: { messages: { m: { bindings: MESSAGE_BAD } } } } } }],
  ["components.operations", "components.operations.o.bindings.ros2", OPERATION_FINDING, { components: { operations: { o: { action: "send", bindings: OPERATION_BAD } } } }],
  ["components.operations trait", "components.operations.o.traits.0.bindings.ros2", OPERATION_FINDING, { components: { operations: { o: { action: "send", traits: [{ bindings: OPERATION_BAD }] } } } }],
  ["components.messages", "components.messages.m.bindings.googlepubsub.schema", MESSAGE_FINDING, { components: { messages: { m: { bindings: MESSAGE_BAD } } } }],
  ["components.messages trait", "components.messages.m.traits.0.bindings.googlepubsub.schema", MESSAGE_FINDING, { components: { messages: { m: { traits: [{ bindings: MESSAGE_BAD }] } } } }],
  ["components.serverBindings", "components.serverBindings.b.jms", SERVER_FINDING, { components: { serverBindings: { b: SERVER_BAD } } }],
  ["components.channelBindings", "components.channelBindings.b.pulsar", CHANNEL_FINDING, { components: { channelBindings: { b: CHANNEL_BAD } } }],
  ["components.operationBindings", "components.operationBindings.b.ros2", OPERATION_FINDING, { components: { operationBindings: { b: OPERATION_BAD } } }],
  ["components.messageBindings", "components.messageBindings.b.googlepubsub.schema", MESSAGE_FINDING, { components: { messageBindings: { b: MESSAGE_BAD } } }],
];

const probe = (version) =>
  base(
    {
      servers: { probe: { host: "probe:61616", protocol: "jms", bindings: { jms: { replicas: 1, clientID: "probe" } } } },
      channels: { probe: { address: "probe.events", bindings: { kafka: REQUIRED_BINDING_CASES.probe } } },
    },
    version
  );
const PROBE_FALLBACK = [finding("servers.probe.bindings.jms", "Server", "jms", "jmsConnectionFactory")];

describe("AAR069 (AsyncAPI 3.x): protocol bindings must declare their required fields", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  describe("shipped required_binding_props", () => {
    test.each(VERSIONS)("passes a realistic AsyncAPI %s document whose bindings declare every required field", async (version) => {
      expect(findings(await linter.run(withVersion(okExample, version)))).toEqual([]);
    });

    test.each(VERSIONS)("reports every missing field in servers, channels, operations, messages, traits and components on AsyncAPI %s", async (version) => {
      expect(findings(await linter.run(withVersion(failExample, version)))).toEqual(FAIL_EXAMPLE);
    });

    test("treats any version whose major is 3 or higher as 3.x", async () => {
      for (const version of [3, "3", "3.0", " 3.1.0 ", "3.2.0", "4.0.0"]) {
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

    test.each(VERSIONS)("a document holding a complete binding of every protocol with required fields passes on AsyncAPI %s", async (version) => {
      const doc = base({}, version);
      for (const [kind, protocols] of Object.entries(REQUIRED_BINDING_CASES.complete)) {
        setAt(doc, HOLDERS[kind], clone(protocols));
      }
      expect(findings(await linter.run(doc))).toEqual([]);
    });

    test.each(VERSIONS)("an empty binding of every protocol reports exactly the top-level required fields of each kind on AsyncAPI %s", async (version) => {
      const empty = Object.fromEntries(BINDING_KEY_CASES.allowed.map((protocol) => [protocol, {}]));
      const doc = base({}, version);
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
          finding("operations.probe.bindings.ros2", "Operation", "ros2", "role"),
          finding("operations.probe.bindings.ros2", "Operation", "ros2", "node"),
          finding("operations.probe.bindings.sns", "Operation", "sns", "consumers"),
          finding("operations.probe.bindings.sqs", "Operation", "sqs", "queues"),
        ].sort()
      );
    });

    test.each(REQUIRED_BINDING_CASES.defaults.map(caseName))("reports %s when it is missing, on AsyncAPI 3.0 and 3.1", async (_, entry) => {
      const [kind, protocol, steps] = entry;
      for (const version of VERSIONS) {
        const doc = placeBindings(kind, { [protocol]: removeAt(completeBinding(kind, protocol), steps) }, version);
        expect([version, findings(await linter.run(doc))]).toEqual([version, [finding(parentPath(entry), LABELS[kind], protocol, ...fieldsOf(entry))]]);
      }
    });

    test.each(REQUIRED_BINDING_CASES.defaults.map(caseName))("accepts false, 0, empty lists and objects, padded strings and $ref values for %s", async (_, entry) => {
      const [kind, protocol, steps] = entry;
      const own = message(LABELS[kind], protocol, ...fieldsOf(entry));
      for (const value of REQUIRED_BINDING_CASES.presentValues) {
        const doc = placeBindings(kind, { [protocol]: setAt(completeBinding(kind, protocol), steps, clone(value)) });
        expect([value, only(await linter.run(doc)).filter((r) => r.message === own)]).toEqual([value, []]);
      }
    });

    test.each(REQUIRED_BINDING_CASES.defaults.map(caseName))("treats null, empty and blank strings as missing for %s", async (_, entry) => {
      const [kind, protocol, steps] = entry;
      for (const value of REQUIRED_BINDING_CASES.missingValues) {
        const doc = placeBindings(kind, { [protocol]: setAt(completeBinding(kind, protocol), steps, value) }, "3.1.0");
        expect([value, findings(await linter.run(doc))]).toEqual([value, [finding(parentPath(entry), LABELS[kind], protocol, ...fieldsOf(entry))]]);
      }
    });

    test.each(REQUIRED_BINDING_CASES.optionalParents.map(caseName))("requires nothing below %s when that optional object is absent", async (_, [kind, protocol, steps]) => {
      const doc = placeBindings(kind, { [protocol]: removeAt(completeBinding(kind, protocol), steps) });
      expect(findings(await linter.run(doc))).toEqual([]);
    });

    test("checks a nested requirement in every item of a list, naming the item index", async () => {
      const queues = [{ name: "a" }, {}, { name: "c", redrivePolicy: {} }, { name: "d", policy: { statements: [{ effect: "Allow", principal: "*", action: "sqs:*" }, { effect: "Deny" }] } }];
      const doc = base({ operations: { o: { action: "receive", bindings: { sqs: { queues } } } } });
      expect(findings(await linter.run(doc))).toEqual(
        [
          finding("operations.o.bindings.sqs.queues.1", "Operation", "sqs", "queues[1].name"),
          finding("operations.o.bindings.sqs.queues.2.redrivePolicy", "Operation", "sqs", "queues[2].redrivePolicy.deadLetterQueue"),
          finding("operations.o.bindings.sqs.queues.3.policy.statements.1", "Operation", "sqs", "queues[3].policy.statements[1].principal"),
          finding("operations.o.bindings.sqs.queues.3.policy.statements.1", "Operation", "sqs", "queues[3].policy.statements[1].action"),
        ].sort()
      );
    });

    test("treats a protocol declared without a value as an empty binding", async () => {
      const doc = base({
        servers: { s: { host: "mq:61616", protocol: "jms", bindings: { jms: null } } },
        channels: { c: { address: null, bindings: { pulsar: null, sqs: null, sns: null }, messages: { m: { bindings: { googlepubsub: null } } } } },
        operations: { o: { action: "send", bindings: { ros2: null, sns: null, sqs: null } } },
      });
      expect(findings(await linter.run(doc))).toEqual(
        [
          finding("servers.s.bindings.jms", "Server", "jms", "jmsConnectionFactory"),
          finding("channels.c.bindings.pulsar", "Channel", "pulsar", "namespace"),
          finding("channels.c.bindings.pulsar", "Channel", "pulsar", "persistence"),
          finding("channels.c.bindings.sqs", "Channel", "sqs", "queue"),
          finding("channels.c.bindings.sns", "Channel", "sns", "name"),
          finding("operations.o.bindings.ros2", "Operation", "ros2", "role"),
          finding("operations.o.bindings.ros2", "Operation", "ros2", "node"),
          finding("operations.o.bindings.sns", "Operation", "sns", "consumers"),
          finding("operations.o.bindings.sqs", "Operation", "sqs", "queues"),
        ].sort()
      );
    });

    test("applies each requirement only to bindings of its own kind", async () => {
      const doc = base({
        servers: { s: { host: "mq:61616", protocol: "pulsar", bindings: { pulsar: {}, sqs: {}, ros2: {}, googlepubsub: { schema: {} } } } },
        channels: { c: { bindings: { jms: {}, ros2: {} }, messages: { m: { bindings: { jms: {}, sqs: {}, pulsar: {}, ros2: {} } } } } },
        operations: { o: { action: "send", bindings: { jms: {}, pulsar: {}, googlepubsub: { schema: {} } } } },
      });
      expect(findings(await linter.run(doc))).toEqual([]);
    });

    test.each(LOCATIONS)("reports a %s binding with its kind and the exact path", async (_, path, [kind, protocol, field], extra) => {
      for (const version of VERSIONS) {
        const results = only(await linter.run(base(extra, version)));
        expect([version, results.map((r) => [r.path.join("."), r.message])]).toEqual([version, [[path, message(kind, protocol, field)]]]);
      }
    });

    test("never checks message and operation trait definitions on their own, nor replies, reply addresses or operation message lists", async () => {
      const doc = base({
        channels: { c: { address: "yard.events", messages: { m: { name: "m" } } } },
        operations: {
          o: {
            action: "send",
            channel: { $ref: "#/channels/c" },
            messages: [{ $ref: "#/channels/c/messages/m" }, { bindings: MESSAGE_BAD }],
            reply: { address: { location: "$message.header#/replyTo", bindings: CHANNEL_BAD }, channel: { $ref: "#/channels/c" }, bindings: OPERATION_BAD },
          },
        },
        components: {
          messageTraits: { t: { bindings: MESSAGE_BAD } },
          operationTraits: { t: { bindings: OPERATION_BAD }, u: { bindings: { sns: {} } } },
          replies: { r: { channel: { $ref: "#/channels/c" }, bindings: OPERATION_BAD } },
          replyAddresses: { a: { location: "$message.header#/replyTo", bindings: CHANNEL_BAD } },
        },
      });
      expect(findings(await linter.run(doc))).toEqual([]);
    });

    test("ignores 2.x publish, subscribe and message.oneOf structures in a 3.x document, but checks the message that carries the oneOf", async () => {
      const doc = base({
        channels: {
          c: {
            publish: { bindings: OPERATION_BAD, message: { bindings: MESSAGE_BAD } },
            subscribe: { traits: [{ bindings: OPERATION_BAD }] },
            messages: { m: { oneOf: [{ bindings: MESSAGE_BAD }], bindings: MESSAGE_BAD } },
          },
        },
        operations: { o: { action: "send", message: { bindings: MESSAGE_BAD } } },
      });
      expect(findings(await linter.run(doc))).toEqual([finding("channels.c.messages.m.bindings.googlepubsub.schema", ...MESSAGE_FINDING)]);
    });

    test.each(VERSIONS)("merges traits as AsyncAPI %s does: the object's own values win, later traits win over earlier ones, and lists are replaced whole", async (version) => {
      expect(findings(await linter.run(withVersion(failTraitsMerge, version)))).toEqual(TRAITS_MERGE);
    });

    test("the same trait conflict resolves the other way under 2.x merge rules, where the trait wins", async () => {
      const operation = { bindings: { ros2: { role: "", node: "/yard/crane" } }, traits: [{ bindings: { ros2: { role: "subscriber" } } }] };
      const v3 = base({ operations: { o: { action: "send", ...clone(operation) } } });
      const v2 = { ...base({ channels: { c: { publish: clone(operation) } } }), asyncapi: "2.6.0" };
      expect(findings(await linter.run(v3))).toEqual([finding("operations.o.bindings.ros2", "Operation", "ros2", "role")]);
      expect(findings(await linter.run(v2))).toEqual([]);
    });

    test.each(VERSIONS)("validates a shared server, channel, operation, message or bindings object once at its definition on AsyncAPI %s", async (version) => {
      expect(findings(await linter.run(withVersion(failSharedRef, version)))).toEqual(SHARED_REF);
    });

    test.each(VERSIONS)("skips null, scalar and array nodes, malformed traits, 2.x-only structures, schemas, examples and extensions on AsyncAPI %s", async (version) => {
      expect(findings(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
    });

    test("validates servers, channels, operations and messages whose key starts with x-, which are names and not extensions in these maps", async () => {
      const doc = base({
        servers: { "x-edge": { host: "mq:61616", protocol: "jms", bindings: SERVER_BAD } },
        channels: { "x-internal": { bindings: CHANNEL_BAD, messages: { "x-legacy": { bindings: MESSAGE_BAD } } } },
        operations: { "x-op": { action: "send", bindings: OPERATION_BAD } },
        components: { serverBindings: { "x-shared": SERVER_BAD } },
      });
      expect(findings(await linter.run(doc))).toEqual(
        [
          finding("servers.x-edge.bindings.jms", ...SERVER_FINDING),
          finding("channels.x-internal.bindings.pulsar", ...CHANNEL_FINDING),
          finding("channels.x-internal.messages.x-legacy.bindings.googlepubsub.schema", ...MESSAGE_FINDING),
          finding("operations.x-op.bindings.ros2", ...OPERATION_FINDING),
          finding("components.serverBindings.x-shared.jms", ...SERVER_FINDING),
        ].sort()
      );
    });

    test("does not inspect a document without the asyncapi field", async () => {
      const { asyncapi, ...withoutVersion } = failExample;
      expect(asyncapi).toBe("3.0.0");
      expect(findings(await linter.run(withoutVersion))).toEqual([]);
    });

    test.each(VERSIONS)("handles a very large AsyncAPI %s document and reports exactly the generated violations", async (version) => {
      expect(findings(await linter.run(withVersion(failLargeGenerated.document, version)))).toEqual(failLargeGenerated.expected);
    });
  });

  describe("configured required_binding_props", () => {
    test.each(REQUIRED_BINDING_CASES.usableMissing)("%p requires a field the probe binding lacks on AsyncAPI 3.0 and 3.1", async (entry, field) => {
      const configured = await withOptions(entry);
      const path = field.startsWith("'topicConfiguration") ? "channels.probe.bindings.kafka.topicConfiguration" : "channels.probe.bindings.kafka";
      for (const version of VERSIONS) {
        expect([version, findings(await configured.run(probe(version)))]).toEqual([version, [`${path} :: AAR069: Channel binding 'kafka' must declare ${field}.`]]);
      }
    });

    test.each(REQUIRED_BINDING_CASES.usableSatisfied)("%p is a usable entry the probe document satisfies", async (entry) => {
      const configured = await withOptions(entry);
      expect(findings(await configured.run(probe("3.1.0")))).toEqual([]);
    });

    test.each(REQUIRED_BINDING_CASES.unusable)("%p is ignored, so a list made only of it falls back to the shipped requirements", async (entry) => {
      const configured = await withOptions(entry);
      expect(findings(await configured.run(probe("3.0.0")))).toEqual(PROBE_FALLBACK);
    });

    test.each(REQUIRED_BINDING_CASES.fallbackValues.map((value) => [value]))("falls back to the shipped requirements when required_binding_props is %p", async (value) => {
      const configured = await withOptions(value);
      expect(findings(await configured.run(failExample))).toEqual(FAIL_EXAMPLE);
      expect(findings(await configured.run(withVersion(okExample, "3.1.0")))).toEqual([]);
    });

    test("a configured list replaces the shipped one instead of extending it", async () => {
      const configured = await withOptions("channel.kafka.replicas");
      expect(findings(await configured.run(failExample))).toEqual([]);
      expect(findings(await configured.run(probe("3.1.0")))).toEqual([finding("channels.probe.bindings.kafka", "Channel", "kafka", "replicas")]);
    });

    test("wildcards select every kind, every protocol or both across servers, channels, operations and channel messages", async () => {
      const doc = base({
        servers: { s: { host: "mq:61616", protocol: "jms", bindings: { jms: {}, kafka: { bindingVersion: "0.5.0" } } } },
        channels: { c: { address: null, bindings: { kafka: {}, "x-retention": {} }, messages: { m: { bindings: { googlepubsub: {} } } } } },
        operations: { o: { action: "send", bindings: { ros2: { bindingVersion: "0.1.0" }, sns: {} }, traits: [{ $ref: "#/components/operationTraits/version" }] } },
        components: { operationTraits: { version: { bindings: { sns: { bindingVersion: "0.1.0" } } } } },
      });
      const run = async (value) => findings(await (await withOptions(value)).run(doc));
      const version = (path, kind, protocol) => finding(path, kind, protocol, "bindingVersion");
      expect(await run("*.*.bindingVersion")).toEqual(
        [
          version("servers.s.bindings.jms", "Server", "jms"),
          version("channels.c.bindings.kafka", "Channel", "kafka"),
          version("channels.c.messages.m.bindings.googlepubsub", "Message", "googlepubsub"),
        ].sort()
      );
      expect(await run("operation.*.bindingVersion")).toEqual([]);
      expect(await run("*.kafka.bindingVersion")).toEqual([version("channels.c.bindings.kafka", "Channel", "kafka")]);
      expect(await run("message.*.bindingVersion")).toEqual([version("channels.c.messages.m.bindings.googlepubsub", "Message", "googlepubsub")]);
    });

    test("a Kafka governance profile checks topics, consumer groups and message keys of a realistic document", async () => {
      const configured = await withOptions(
        "channel.kafka.topic, channel.kafka.partitions, channel.kafka.replicas, channel.kafka.topicConfiguration[retention.ms], channel.kafka.topicConfiguration[max.message.bytes], operation.kafka.groupId, message.kafka.key, message.kafka.schemaIdLocation, server.kafka.schemaRegistryUrl"
      );
      for (const version of VERSIONS) {
        expect([version, findings(await configured.run(withVersion(okExample, version)))]).toEqual([
          version,
          [
            finding("channels.temperatureReadings.bindings.kafka.topicConfiguration", "Channel", "kafka", "topicConfiguration[max.message.bytes]"),
            finding("channels.temperatureReadings.messages.temperatureReading.bindings.kafka", "Message", "kafka", "schemaIdLocation"),
            finding("components.messages.shipmentDispatched.bindings.kafka", "Message", "kafka", "schemaIdLocation"),
          ].sort(),
        ]);
      }
    });

    test("configured requirements merge traits and follow $ref definitions exactly as the shipped ones", async () => {
      const configured = await withOptions("operation.ros2.node, operation.ros2.qosPolicies, message.googlepubsub.orderingKey");
      expect(findings(await configured.run(okExample))).toEqual(
        [
          finding("operations.receiveRobotAck.bindings.ros2", "Operation", "ros2", "qosPolicies"),
          finding("components.operationBindings.snsFanout.ros2", "Operation", "ros2", "qosPolicies"),
          finding("channels.temperatureReadings.messages.temperatureReading.bindings.googlepubsub", "Message", "googlepubsub", "orderingKey"),
          finding("components.channels.auditTrail.messages.auditEntry.bindings.googlepubsub", "Message", "googlepubsub", "orderingKey"),
          finding("components.messages.erpOrder.bindings.googlepubsub", "Message", "googlepubsub", "orderingKey"),
        ].sort()
      );
    });
  });
});
