const deepPropertySchema = (levels) => {
  let schema = { type: "object", properties: { trackingCode: { type: "string" }, tracking_code: { type: "string" } } };
  for (let level = levels; level > 0; level--) {
    schema = { type: "object", properties: { [`level${level}`]: schema } };
  }
  return schema;
};

const DEEP_PROPERTY_PATH = `${Array.from({ length: 12 }, (_, index) => `properties.level${index + 1}`).join(".")}.properties.tracking_code`;

const PROPERTY_KEYWORD_CASES = [
  ["properties", { type: "object", properties: { orderId: { type: "string" }, order_id: { type: "string" } } }, ["properties.order_id"]],
  ["nested properties", { type: "object", properties: { customer: { type: "object", properties: { Customer_Id: { type: "string" }, emailAddress: { type: "string" } } } } }, ["properties.customer.properties.Customer_Id"]],
  ["items", { type: "array", items: { type: "object", properties: { line_no: { type: "integer" } } } }, ["items.properties.line_no"]],
  ["tuple items", { type: "array", items: [{ type: "string" }, { type: "object", properties: { LineNo: { type: "integer" } } }] }, ["items.1.properties.LineNo"]],
  ["prefixItems", { type: "array", prefixItems: [{ type: "object", properties: { "line-no": { type: "integer" } } }] }, ["prefixItems.0.properties.line-no"]],
  ["additionalItems", { type: "array", items: [{ type: "string" }], additionalItems: { properties: { extra_item: {} } } }, ["additionalItems.properties.extra_item"]],
  ["unevaluatedItems", { type: "array", unevaluatedItems: { properties: { Unevaluated: {} } } }, ["unevaluatedItems.properties.Unevaluated"]],
  ["contains", { type: "array", contains: { properties: { contained_sku: {} } } }, ["contains.properties.contained_sku"]],
  ["additionalProperties", { type: "object", additionalProperties: { type: "object", properties: { map_value: {} } } }, ["additionalProperties.properties.map_value"]],
  ["unevaluatedProperties", { unevaluatedProperties: { properties: { "Not Evaluated": {} } } }, ["unevaluatedProperties.properties.Not Evaluated"]],
  ["patternProperties values, never their regular expressions", { type: "object", patternProperties: { "^Snake_[a-z]+$": { properties: { pattern_value: {} } } } }, ["patternProperties.^Snake_[a-z]+$.properties.pattern_value"]],
  ["allOf", { allOf: [{ type: "object" }, { properties: { all_of: {} } }] }, ["allOf.1.properties.all_of"]],
  ["anyOf", { anyOf: [{ properties: { cardNumber: {} } }, { properties: { iban_code: {} } }] }, ["anyOf.1.properties.iban_code"]],
  ["oneOf", { oneOf: [{ properties: { One_Of: {} } }, { type: "null" }] }, ["oneOf.0.properties.One_Of"]],
  ["not", { not: { properties: { not_allowed: {} } } }, ["not.properties.not_allowed"]],
  ["if, then and else", { if: { properties: { If_Field: {} } }, then: { properties: { then_field: {} } }, else: { properties: { "else-field": {} } } }, ["else.properties.else-field", "if.properties.If_Field", "then.properties.then_field"]],
  ["definitions", { definitions: { Address: { properties: { postal_code: {} } } } }, ["definitions.Address.properties.postal_code"]],
  ["$defs", { $defs: { Money: { properties: { Amount: {} } } } }, ["$defs.Money.properties.Amount"]],
  ["dependentSchemas", { dependentSchemas: { creditCard: { properties: { billing_address: {} } } } }, ["dependentSchemas.creditCard.properties.billing_address"]],
  ["dependencies in schema form, not in array form", { dependencies: { creditCard: { properties: { Billing: {} } }, iban: ["bic_code"] } }, ["dependencies.creditCard.properties.Billing"]],
  ["a JSON Schema nullable type array", { type: ["object", "null"], properties: { cancelled_at: { type: ["string", "null"], format: "date-time" } } }, ["properties.cancelled_at"]],
  ["an OpenAPI nullable object", { type: "object", nullable: true, properties: { CancelledAt: { type: "string", nullable: true } } }, ["properties.CancelledAt"]],
  ["properties named after schema keywords and extensions", { properties: { properties: { properties: { Type: {} } }, type: {}, fields: {}, items: {}, "x-trace": {} } }, ["properties.properties.properties.Type", "properties.x-trace"]],
  ["boolean subschemas", { properties: { anything: true, nothing: false, Any_Thing: true }, additionalProperties: false, items: true }, ["properties.Any_Thing"]],
  ["empty, numeric and non-ASCII property names", { properties: { "": {}, 42: {}, "2fa": {}, "usér": {}, ok: {} } }, ["properties.", "properties.2fa", "properties.42", "properties.usér"]],
  ["a property with an empty or invalid schema", { properties: { order_id: null, Customer: "string", line_items: [] } }, ["properties.Customer", "properties.line_items", "properties.order_id"]],
  ["a twelve-level property chain", deepPropertySchema(12), [DEEP_PROPERTY_PATH]],
  ["Avro record fields", { type: "record", name: "OrderPlaced", namespace: "com.acme.orders", fields: [{ name: "orderId", type: "string" }, { name: "order_total", type: "double" }] }, ["fields.1.name"]],
  ["an Avro error type", { type: "error", name: "PaymentFailed", fields: [{ name: "ErrorCode", type: "string" }] }, ["fields.0.name"]],
  ["a nullable Avro union", { type: "record", name: "Shipment", fields: [{ name: "carrier", type: ["null", { type: "record", name: "Carrier", fields: [{ name: "carrier_code", type: "string" }] }], default: null }] }, ["fields.0.type.1.fields.0.name"]],
  ["Avro arrays and maps", { type: "record", name: "Cart", fields: [{ name: "lines", type: { type: "array", items: { type: "record", name: "Line", fields: [{ name: "Sku", type: "string" }] } } }, { name: "attributes", type: { type: "map", values: { type: "record", name: "Attribute", fields: [{ name: "attr-value", type: "string" }] } } }] }, ["fields.0.type.items.fields.0.name", "fields.1.type.values.fields.0.name"]],
  ["a nested Avro type wrapper", { type: "record", name: "Envelope", fields: [{ name: "body", type: { type: { type: "record", name: "Body", fields: [{ name: "BodyText", type: "string" }] } } }] }, ["fields.0.type.type.fields.0.name"]],
  ["a union of Avro records", { type: "record", name: "Payment", fields: [{ name: "method", type: [{ type: "record", name: "Card", fields: [{ name: "card_number", type: "string" }] }, { type: "record", name: "Transfer", fields: [{ name: "iban", type: "string" }] }, "null"] }] }, ["fields.0.type.0.fields.0.name"]],
  ["a top-level Avro union", [{ type: "record", name: "Created", fields: [{ name: "created_by", type: "string" }] }, { type: "record", name: "Deleted", fields: [{ name: "deletedBy", type: "string" }] }], ["0.fields.0.name"]],
  [
    "Avro type names, namespaces, enum symbols, aliases, defaults and docs",
    {
      type: "record",
      name: "order_placed",
      namespace: "com.acme.Orders_V1",
      aliases: ["Order_Placed"],
      doc: "Uses order_id.",
      fields: [
        { name: "status", type: { type: "enum", name: "Order_Status", symbols: ["PENDING_PAYMENT", "shipped"] }, aliases: ["order_status"], default: "PENDING_PAYMENT", doc: "snake_case doc" },
        { name: "checksum", type: { type: "fixed", name: "MD5_Hash", size: 16 } },
        { name: "meta", type: "com.acme.Meta_Info", default: { Some_Key: 1 } },
      ],
    },
    [],
  ],
  [
    "values that are not schemas",
    {
      type: "object",
      required: ["order_id"],
      properties: { orderId: { type: "string", examples: [{ order_id: "1" }], default: "1" } },
      example: { properties: { Bad_Example: 1 } },
      examples: [{ properties: { Bad: 1 } }],
      default: { order_id: "1", properties: { Default_Key: 1 } },
      enum: [{ order_id: "1" }],
      const: { properties: { Const_Key: {} } },
      discriminator: "order_type",
      "x-properties": { properties: { x_bad: {} } },
      externalDocs: { url: "https://docs.acme.example.com" },
      title: "Order_Title",
      description: "Holds the order_id.",
    },
    [],
  ],
  ["an OpenAPI discriminator", { oneOf: [{ properties: { cardNumber: {} } }], discriminator: { propertyName: "payment_type", mapping: { card_payment: "#/components/schemas/Card" } } }, []],
  ["propertyNames", { type: "object", propertyNames: { pattern: "^[a-z]+$", properties: { Not_Walked: {} } } }, []],
  ["Avro fields without a usable name", { type: "record", name: "Sparse", fields: [{ type: "string" }, { name: null, type: "int" }, null, "order_id", 42, ["order_id"]] }, []],
  ["an Avro record whose fields are not an array", { type: "record", name: "Broken", fields: { order_id: "string" } }, []],
  ["fields outside an Avro record", { type: "object", fields: [{ name: "order_id" }] }, []],
  ["properties that are not a map", { type: "object", properties: ["order_id"], items: [{ properties: null }, { properties: "order_id" }] }, []],
];

const NON_STRING_AVRO_NAMES = [
  [42, "Avro field name must be a camelCase string."],
  [0, "Avro field name must be a camelCase string."],
  [true, "Avro field name must be a camelCase string."],
  [false, "Avro field name must be a camelCase string."],
  [{ value: "orderId" }, 'Avro field name must be a camelCase string.'],
  [["orderId"], 'Avro field name must be a camelCase string.'],
  ["", "Avro field name '' must be camelCase."],
  [" orderId", "Avro field name ' orderId' must be camelCase."],
];

const PROPERTY_FORMAT_CASES = [
  [undefined, "json"],
  [null, "json"],
  ["application/vnd.aai.asyncapi;version=2.6.0", "json"],
  ["application/vnd.aai.asyncapi+json;version=3.0.0", "json"],
  ["application/vnd.aai.asyncapi+yaml;version=3.1.0", "json"],
  ["APPLICATION/VND.AAI.ASYNCAPI+JSON;VERSION=2.6.0", "json"],
  ["application/schema+json;version=draft-07", "json"],
  ["application/schema+yaml;version=draft-07", "json"],
  ["application/vnd.oai.openapi;version=3.0.0", "json"],
  ["application/vnd.oai.openapi+json;version=3.0.0", "json"],
  ["application/vnd.oai.openapi+yaml;version=3.0.0", "json"],
  ["application/vnd.apache.avro;version=1.9.0", "avro"],
  ["application/vnd.apache.avro+json;version=1.9.0", "avro"],
  ["application/vnd.apache.avro+yaml;version=1.9.0", "avro"],
  ["application/vnd.apache.avro", "avro"],
  [" Application/Vnd.Apache.Avro ; version=1.9.0", "avro"],
  ["application/raml+yaml;version=1.0", null],
  ["application/vnd.google.protobuf;version=3", null],
  ["application/x-protobuf", null],
  ["application/json", null],
  ["application/xml", null],
  ["", null],
  [42, null],
  [true, null],
  [{}, null],
  [["application/vnd.apache.avro;version=1.9.0"], null],
];

const PROPERTY_FORMAT_PAYLOADS = {
  json: { type: "object", properties: { orderId: { type: "string" }, order_id: { type: "string" } } },
  avro: { type: "record", name: "OrderPlaced", fields: [{ name: "orderId", type: "string" }, { name: "order_id", type: "string" }] },
};

const PROPERTY_FORMAT_FINDINGS = { json: ["properties.order_id"], avro: ["fields.1.name"] };

const AVRO_TEXT_SCHEMA = JSON.stringify({ type: "record", name: "OrderPlaced", fields: [{ name: "orderId", type: "string" }, { name: "order_id", type: "string" }, { name: "Line_Count", type: "int" }] });

module.exports = {
  PROPERTY_KEYWORD_CASES,
  NON_STRING_AVRO_NAMES,
  PROPERTY_FORMAT_CASES,
  PROPERTY_FORMAT_PAYLOADS,
  PROPERTY_FORMAT_FINDINGS,
  AVRO_TEXT_SCHEMA,
};
