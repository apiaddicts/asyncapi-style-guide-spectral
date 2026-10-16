const complete = { description: "Streaming operations handbook.", url: "https://docs.lumen.example.com/operations" };
const urlOnly = (topic) => ({ url: `https://docs.lumen.example.com/${topic}` });
const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:com:lumen:streaming-platform",
  info: {
    title: "Lumen Streaming Platform",
    version: "9.1.0",
    description: "Playback, session and audit events of the Lumen video streaming platform.",
    externalDocs: urlOnly("platform"),
    tags: [
      { name: "playback", description: "Playback events.", externalDocs: { description: "Playback handbook.", url: "" } },
      { $ref: "#/components/tags/catalog" },
    ],
  },
  externalDocs: {},
  tags: [{ name: "not-a-3x-location", externalDocs: {} }],
  servers: {
    kafkaEdge: {
      host: "kafka.lumen.example.com:9093",
      protocol: "kafka-secure",
      externalDocs: { description: " ", url: "https://docs.lumen.example.com/kafka" },
      tags: [{ name: "edge", description: "Edge cluster.", externalDocs: "https://docs.lumen.example.com/edge" }],
    },
    wsPlayers: { host: "live.lumen.example.com", pathname: "/players", protocol: "wss", externalDocs: { $ref: "#/components/externalDocs/missing" } },
  },
  channels: {
    playbackEvents: {
      address: "lumen.cdc.playback.events.v1",
      title: "Playback events",
      externalDocs: urlOnly("playback-events"),
      tags: [{ name: "playback", description: "Playback events.", externalDocs: {} }],
      messages: {
        playbackStarted: {
          name: "playbackStarted",
          title: "Playback started",
          contentType: "application/json",
          externalDocs: { description: "Playback started." },
          tags: [{ name: "started", description: "Session start.", externalDocs: { description: "Start events.", url: null } }],
          traits: [{ $ref: "#/components/messageTraits/deviceHeaders" }, [{ externalDocs: urlOnly("tuple-trait") }, {}]],
          headers: { schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0", schema: { type: "object", externalDocs: { description: "Playback headers." } } },
          payload: {
            type: "object",
            properties: {
              sessionId: { type: "string", format: "uuid", externalDocs: urlOnly("sessions") },
              bitrate: { type: ["integer", "null"], minimum: 0, externalDocs: { description: "Bitrate in kbps.", url: "  " } },
              device: { $ref: "#/components/schemas/Device" },
            },
            examples: [{ sessionId: "6f1c0d64-4f7e-4d5f-9b5e-1d7f2c3b4a5d", externalDocs: {} }],
          },
        },
        playbackStopped: {
          name: "playbackStopped",
          title: "Playback stopped",
          externalDocs: null,
          payload: { schemaFormat: AVRO, schema: { type: "record", name: "PlaybackStopped", externalDocs: {}, fields: [{ name: "position", type: ["null", "long"], default: null }] } },
        },
      },
    },
    sessionReplies: {
      address: null,
      title: "Session replies",
      externalDocs: { description: "Session replies.", url: "" },
      messages: {
        sessionAccepted: {
          name: "sessionAccepted",
          title: "Session accepted",
          externalDocs: complete,
          payload: { schemaFormat: "application/schema+json;version=draft-07", schema: { $ref: "#/components/schemas/Session" } },
        },
      },
    },
    legacy: {
      address: "lumen/legacy/{id}",
      title: "Legacy feed",
      parameters: { id: { description: "Legacy id.", schema: { type: "string", externalDocs: {} } } },
      publish: { externalDocs: {} },
      messages: { legacyEvent: { name: "legacyEvent", oneOf: [{ externalDocs: {} }] } },
    },
  },
  operations: {
    sendPlayback: {
      action: "send",
      channel: { $ref: "#/channels/playbackEvents" },
      messages: [{ $ref: "#/channels/playbackEvents/messages/playbackStarted" }],
      externalDocs: urlOnly("send-playback"),
      tags: [{ name: "producers", description: "Producers.", externalDocs: { description: "Producer guide." } }],
      traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }, { externalDocs: [] }],
    },
    requestSession: {
      action: "send",
      channel: { $ref: "#/channels/playbackEvents" },
      externalDocs: { $ref: "#/components/externalDocs/sessions" },
      reply: { $ref: "#/components/replies/session" },
    },
  },
  components: {
    externalDocs: {
      sessions: urlOnly("sessions-handbook"),
      unreferenced: { description: "Unreferenced, but still a components entry." },
      nothing: null,
    },
    tags: {
      catalog: { name: "catalog", description: "Catalog events.", externalDocs: { description: "Catalog handbook." } },
      billing: { name: "billing", description: "Billing events.", externalDocs: { description: "Billing handbook.", url: "" } },
    },
    schemas: {
      Device: { type: "object", externalDocs: { description: "Playback device." }, properties: { model: { type: "string" } } },
      Session: { type: "object", $defs: { token: { type: "string", externalDocs: urlOnly("session-tokens") } }, properties: { token: { $ref: "#/components/schemas/Session/$defs/token" } } },
      Quality: { schemaFormat: "application/vnd.oai.openapi;version=3.0.0", schema: { type: "object", nullable: true, externalDocs: {} } },
      AvroThing: { schemaFormat: AVRO, schema: { type: "record", name: "Thing", externalDocs: {}, fields: [] } },
    },
    replies: {
      session: {
        channel: { $ref: "#/channels/sessionReplies" },
        messages: [{ $ref: "#/channels/sessionReplies/messages/sessionAccepted" }],
        externalDocs: {},
      },
    },
    operationTraits: { kafkaProducer: { externalDocs: { description: "Producer runbook.", url: " " } } },
    messageTraits: {
      deviceHeaders: {
        externalDocs: urlOnly("device-headers"),
        headers: { type: "object", properties: { deviceId: { type: "string", externalDocs: {} } } },
      },
    },
    servers: { kafkaDr: { host: "kafka-dr.lumen.example.com:9093", protocol: "kafka-secure", externalDocs: {} } },
    channels: { audit: { address: "lumen.audit.v1", externalDocs: urlOnly("audit") } },
    operations: { receiveAudit: { action: "receive", channel: { $ref: "#/components/channels/audit" }, externalDocs: { description: "Audit consumer." } } },
    messages: { auditRecord: { name: "auditRecord", externalDocs: { $ref: "#/components/externalDocs/nothing" }, payload: { type: "object" } } },
  },
};
