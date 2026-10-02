module.exports = {
  "asyncapi": "3.0.0",
  "info": {
    "title": "Fleet Telemetry Service",
    "version": "2.1.0",
    "description": "Message names that are not strings or are empty, and an empty message key."
  },
  "channels": {
    "vehicleEvents": {
      "address": "fleet/events",
      "messages": {
        "numericName": { "name": 42 },
        "booleanName": { "name": false },
        "emptyName": { "name": "" },
        "objectName": { "name": { "en": "vehicleEvent" } },
        "nullName": { "name": null },
        "": { "name": "vehicleEvent" }
      }
    }
  }
};
