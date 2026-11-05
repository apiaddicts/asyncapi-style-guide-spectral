module.exports = {
  "asyncapi": "2.6.0",
  "info": {
    "version": "1.0.0",
    "title": "Avro Schema Format - +json/+yaml Scenarios"
  },
  "channels": {
    "avroJson": {
      "subscribe": {
        "message": {
          "schemaFormat": "application/vnd.apache.avro+json;version=1.9.0",
          "payload": {
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
    },
    "avroYaml": {
      "subscribe": {
        "message": {
          "schemaFormat": "application/vnd.apache.avro+yaml;version=1.9.0",
          "payload": {
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
};
