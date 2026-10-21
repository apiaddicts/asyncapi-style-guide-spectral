module.exports = {
  asyncapi: "3.0.0",
  id: "urn:com:fabrikam:trading:gateway",
  info: {
    title: "Fabrikam Trading Gateway",
    version: "3.2.0",
    description: "Kafka and WebSocket events of the Fabrikam trading gateway whose schemas mix several property naming styles.",
  },
  defaultContentType: "application/json",
  servers: {
    kafka: {
      host: "kafka.trading.fabrikam.example.com:9093",
      protocol: "kafka-secure",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.trading.fabrikam.example.com", bindingVersion: "0.5.0" } },
    },
    stream: { host: "stream.trading.fabrikam.example.com", pathname: "/v1", protocol: "wss" },
  },
  channels: {
    orderSubmissions: {
      address: "trading.cmd.orders.submitted.v1",
      description: "Orders submitted by the trading desks.",
      messages: {
        orderSubmitted: {
          name: "orderSubmitted",
          contentType: "application/json",
          headers: {
            type: "object",
            properties: { correlationId: { type: "string", format: "uuid" }, "x-session-id": { type: "string" } },
          },
          payload: {
            type: "object",
            required: ["orderId", "client_order_id"],
            properties: {
              orderId: { type: "string" },
              client_order_id: { type: "string" },
              legs: {
                type: "array",
                items: { type: "object", properties: { legId: { type: "string" }, Side: { type: "string", enum: ["BUY", "SELL"] } } },
              },
              limitPrice: { $ref: "#/components/schemas/Price" },
            },
          },
          bindings: { kafka: { key: { type: "object", properties: { order_key: { type: "string" } } }, bindingVersion: "0.5.0" } },
          examples: [{ name: "submitted", payload: { orderId: "o-1", client_order_id: "c-1", Any_Key: 1 } }],
          traits: [
            { $ref: "#/components/messageTraits/tracing" },
            { headers: { type: "object", properties: { replay_count: { type: "integer" } } } },
          ],
        },
        orderAmended: { $ref: "#/components/messages/orderAmended" },
      },
    },
    executionReports: {
      address: "trading.cdc.executions.v1",
      description: "Executions reported by the venues, encoded with Avro.",
      messages: {
        executionReported: {
          name: "executionReported",
          contentType: "application/vnd.apache.avro+json",
          payload: {
            schemaFormat: "application/vnd.apache.avro;version=1.9.0",
            schema: {
              type: "record",
              name: "ExecutionReport",
              namespace: "com.fabrikam.trading",
              fields: [
                { name: "execId", type: "string" },
                { name: "fill_qty", type: "long" },
                {
                  name: "venue",
                  type: ["null", { type: "record", name: "Venue", fields: [{ name: "MIC", type: "string" }, { name: "venueName", type: "string" }] }],
                  default: null,
                },
              ],
            },
          },
        },
      },
    },
    marketData: {
      address: null,
      description: "Market data pushed over WebSockets; the address is decided at runtime.",
      bindings: { ws: { query: { type: "object", properties: { api_key: { type: "string" } } }, bindingVersion: "0.1.0" } },
      messages: {
        quoteSnapshot: {
          name: "quoteSnapshot",
          payload: {
            schemaFormat: "application/vnd.oai.openapi;version=3.0.0",
            schema: { type: "object", nullable: true, properties: { bidPrice: { type: "number" }, ask_price: { type: "number" }, quotedAt: { type: "string" } } },
          },
        },
        heartbeat: {
          name: "heartbeat",
          payload: { schemaFormat: "application/vnd.google.protobuf;version=3", schema: "message Heartbeat { int64 sent_at = 1; }" },
        },
      },
    },
    riskLimits: {
      address: "trading.sys.risk.limits.{deskId}.v1",
      description: "Risk limit breaches per desk.",
      parameters: { deskId: { $ref: "#/components/parameters/deskId" } },
      messages: {
        limitBreached: {
          name: "limitBreached",
          payload: { $ref: "#/components/schemas/LimitBreach" },
          headers: { $ref: "#/components/schemas/RiskHeaders" },
        },
      },
    },
  },
  operations: {
    submitOrder: {
      action: "send",
      channel: { $ref: "#/channels/orderSubmissions" },
      messages: [{ $ref: "#/channels/orderSubmissions/messages/orderSubmitted" }],
      reply: { channel: { $ref: "#/channels/executionReports" }, messages: [{ $ref: "#/channels/executionReports/messages/executionReported" }] },
    },
    receiveQuotes: {
      action: "receive",
      channel: { $ref: "#/channels/marketData" },
      messages: [{ $ref: "#/channels/marketData/messages/quoteSnapshot" }],
      bindings: { ws: { query: { type: "object", properties: { session_token: { type: "string" } } } } },
    },
  },
  components: {
    schemas: {
      Price: { type: "object", properties: { amount: { type: "number" }, Currency: { type: "string" } } },
      LimitBreach: {
        schemaFormat: "application/schema+json;version=draft-07",
        schema: { type: "object", properties: { limitId: { type: "string" }, breach_pct: { type: "number" } } },
      },
      RiskHeaders: { type: "object", properties: { deskCode: { type: "string" }, "Risk-Officer": { type: "string" } } },
      Instrument: {
        schemaFormat: "application/vnd.apache.avro;version=1.9.0",
        schema: { type: "record", name: "Instrument", fields: [{ name: "isin", type: "string" }, { name: "Ticker_Symbol", type: "string" }] },
      },
    },
    parameters: { deskId: { description: "Trading desk.", enum: ["fx_spot", "RATES"], location: "$message.payload#/desk_id" } },
    channels: {
      settlementInstructions: {
        address: "trading.cmd.settlements.v1",
        messages: { settlementInstructed: { name: "settlementInstructed", payload: { type: "object", properties: { settlementDate: { type: "string" }, ssi_ref: { type: "string" } } } } },
      },
    },
    messages: {
      orderAmended: { name: "orderAmended", payload: { type: "object", properties: { orderId: { type: "string" }, new_quantity: { type: "integer" } } } },
    },
    messageTraits: {
      tracing: {
        headers: {
          schemaFormat: "application/vnd.aai.asyncapi+json;version=3.0.0",
          schema: { type: "object", properties: { traceparent: { type: "string" }, TraceState: { type: "string" } } },
        },
      },
    },
  },
};
