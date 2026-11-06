module.exports = {
  "asyncapi": "2.6.0",
  "info": {
    "version": "1.0.0",
    "title": "Avro Schema Format - Configured Versions Scenarios"
  },
  "channels": {
    "avro1110": {
      "subscribe": {
        "message": {
          "schemaFormat": "application/vnd.apache.avro;version=1.11.0",
          "payload": {
            "type": "record",
            "name": "V1110Value",
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
    "avro1120Json": {
      "subscribe": {
        "message": {
          "schemaFormat": "application/vnd.apache.avro+json;version=1.12.0",
          "payload": {
            "type": "record",
            "name": "V1120Value",
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
    "avro1130": {
      "subscribe": {
        "message": {
          "schemaFormat": "application/vnd.apache.avro;version=1.13.0",
          "payload": {
            "type": "record",
            "name": "V1130Value",
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
