module.exports = {
  "asyncapi": "3.0.0",
  "info": {
    "version": "1.0.0",
    "title": "Avro Schema Format - Configured Versions Scenarios"
  },
  "channels": {
    "avro1110": {
      "address": "avro1110",
      "messages": {
        "Avro1110Message": {
          "payload": {
            "schemaFormat": "application/vnd.apache.avro;version=1.11.0",
            "schema": {
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
      }
    },
    "avro1120Json": {
      "address": "avro1120Json",
      "messages": {
        "Avro1120JsonMessage": {
          "payload": {
            "schemaFormat": "application/vnd.apache.avro+json;version=1.12.0",
            "schema": {
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
      }
    },
    "avro1130": {
      "address": "avro1130",
      "messages": {
        "Avro1130Message": {
          "payload": {
            "schemaFormat": "application/vnd.apache.avro;version=1.13.0",
            "schema": {
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
  }
};
