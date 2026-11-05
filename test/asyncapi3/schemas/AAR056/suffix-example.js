module.exports = {
  "asyncapi": "3.0.0",
  "info": {
    "version": "1.0.0",
    "title": "Avro Schema Format - +json/+yaml Scenarios"
  },
  "channels": {
    "avroJson": {
      "address": "avroJson",
      "messages": {
        "AvroJsonMessage": {
          "payload": {
            "schemaFormat": "application/vnd.apache.avro+json;version=1.9.0",
            "schema": {
              "type": "record",
              "name": "JsonValue",
              "namespace": "com.example.avro",
              "fields": [
                {
                  "name": "id",
                  "type": "string"
                }
              ]
            }
          }
        }
      }
    },
    "avroYaml": {
      "address": "avroYaml",
      "messages": {
        "AvroYamlMessage": {
          "payload": {
            "schemaFormat": "application/vnd.apache.avro+yaml;version=1.9.0",
            "schema": {
              "type": "record",
              "name": "YamlValue",
              "namespace": "com.example.avro",
              "fields": [
                {
                  "name": "id",
                  "type": "string"
                }
              ]
            }
          }
        }
      }
    }
  }
};
