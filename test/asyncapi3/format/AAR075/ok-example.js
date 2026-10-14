const AVRO = "application/vnd.apache.avro;version=1.9.0";

module.exports = {
  asyncapi: "3.0.0",
  id: "urn:support:live-chat",
  info: {
    title: "Customer Support Live Chat",
    version: "2.8.1",
    description:
      "Chat sessions between customers and support agents, agent presence and conversation transcripts.\n\nMessages are delivered over WebSockets to the browsers and mirrored to Kafka for analytics.",
    termsOfService: "https://support.example.io/terms",
    contact: { name: "Support Platform", url: "https://support.example.io/platform", email: "platform@support.example.io" },
    license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    tags: [{ $ref: "#/components/tags/chat" }, { name: "analytics", description: "Conversation analytics feeds." }],
    externalDocs: { $ref: "#/components/externalDocs/supportHandbook" },
    "x-audience": "company-internal",
    "x-api-id": "4a6d3b2e-91f0-4c8e-a7d5-0e3f6b2c1d9a",
  },
  defaultContentType: "application/json",
  servers: {
    chatGateway: {
      host: "chat.support.example.io",
      pathname: "/ws/v2",
      protocol: "wss",
      description: "Browser-facing chat gateway.",
      security: [{ $ref: "#/components/securitySchemes/sessionToken" }],
    },
    analyticsKafka: {
      host: "kafka-{region}.support.example.io:9093",
      protocol: "kafka-secure",
      variables: { region: { enum: ["eu-central", "us-west"], default: "eu-central" } },
      bindings: { kafka: { schemaRegistryUrl: "https://registry.support.example.io", bindingVersion: "0.5.0" } },
    },
  },
  channels: {
    chatRoom: {
      address: "rooms/{roomId}",
      title: "Chat room",
      description: "Messages exchanged in one chat room.",
      servers: [{ $ref: "#/servers/chatGateway" }],
      parameters: { roomId: { description: "Room identifier.", examples: ["room-42"] } },
      messages: {
        chatMessageSent: { $ref: "#/components/messages/chatMessageSent" },
        typingIndicator: {
          name: "typingIndicator",
          title: "Typing indicator",
          payload: { type: "object", properties: { participantId: { type: "string" }, typing: { type: "boolean" } } },
        },
      },
    },
    agentPresence: {
      address: null,
      description: "Presence of agents, addressed dynamically by the gateway.",
      messages: { presenceChanged: { $ref: "#/components/messages/presenceChanged" } },
    },
    transcripts: {
      address: "support.cdc.transcripts.closed.v1",
      servers: [{ $ref: "#/servers/analyticsKafka" }],
      bindings: { kafka: { topic: "support.cdc.transcripts.closed.v1", partitions: 12, bindingVersion: "0.5.0" } },
      messages: { transcriptClosed: { $ref: "#/components/messages/transcriptClosed" } },
    },
    transcriptAcks: { address: "support.cmd.transcripts.ack.v1", messages: { transcriptAck: { payload: { type: "object", properties: { transcriptId: { type: "string" } } } } } },
  },
  operations: {
    sendChatMessage: {
      action: "send",
      title: "Send a chat message",
      summary: "A participant sends a message to the room.",
      channel: { $ref: "#/channels/chatRoom" },
      messages: [{ $ref: "#/channels/chatRoom/messages/chatMessageSent" }],
      tags: [{ name: "chat" }],
    },
    receiveChatMessage: {
      action: "receive",
      channel: { $ref: "#/channels/chatRoom" },
      messages: [{ $ref: "#/channels/chatRoom/messages/chatMessageSent" }, { $ref: "#/channels/chatRoom/messages/typingIndicator" }],
    },
    receivePresence: { action: "receive", channel: { $ref: "#/channels/agentPresence" } },
    publishTranscript: {
      action: "send",
      channel: { $ref: "#/channels/transcripts" },
      reply: { channel: { $ref: "#/channels/transcriptAcks" }, messages: [{ $ref: "#/channels/transcriptAcks/messages/transcriptAck" }] },
      traits: [{ $ref: "#/components/operationTraits/kafkaProducer" }],
    },
  },
  components: {
    messages: {
      chatMessageSent: {
        name: "chatMessageSent",
        title: "Chat message sent",
        contentType: "application/json",
        correlationId: { $ref: "#/components/correlationIds/messageId" },
        traits: [{ $ref: "#/components/messageTraits/traced" }],
        payload: {
          type: "object",
          required: ["messageId", "text"],
          properties: {
            messageId: { type: "string", format: "uuid" },
            text: { type: "string", maxLength: 4000 },
            attachments: { type: ["array", "null"], items: { type: "string", format: "uri" } },
          },
        },
      },
      presenceChanged: {
        name: "presenceChanged",
        title: "Presence changed",
        payload: { type: "object", properties: { agentId: { type: "string" }, status: { type: "string", enum: ["online", "away", "offline"] } } },
      },
      transcriptClosed: {
        name: "transcriptClosed",
        title: "Transcript closed",
        payload: {
          schemaFormat: AVRO,
          schema: {
            type: "record",
            name: "TranscriptClosed",
            namespace: "io.example.support.analytics",
            fields: [
              { name: "transcriptId", type: "string" },
              { name: "durationSeconds", type: "int" },
              { name: "csat", type: ["null", "int"], default: null },
            ],
          },
        },
      },
    },
    tags: { chat: { name: "chat", description: "Real-time chat between customers and agents." } },
    externalDocs: { supportHandbook: { description: "Support platform handbook.", url: "https://support.example.io/handbook" } },
    correlationIds: { messageId: { location: "$message.payload#/messageId" } },
    messageTraits: { traced: { headers: { type: "object", properties: { traceparent: { type: "string" } } } } },
    operationTraits: { kafkaProducer: { bindings: { kafka: { clientId: { type: "string", enum: ["chat-gateway"] }, bindingVersion: "0.5.0" } } } },
    securitySchemes: { sessionToken: { type: "httpApiKey", name: "X-Session-Token", in: "header", description: "Browser session token." } },
  },
};
