module.exports = {
  asyncapi: "3.0.0",
  info: { title: "Vehicle Telemetry Events", version: "1.0.0" },
  defaultContentType: 3.1,
  channels: {
    vehicleEvents: {
      address: "vehicles.events",
      messages: {
        numericType: { name: "numericType", contentType: 1001 },
        booleanType: { name: "booleanType", contentType: true },
        objectType: { name: "objectType", contentType: { mediaType: "application/json" } },
        arrayType: { name: "arrayType", contentType: ["application/json"] },
        emptyType: { name: "emptyType", contentType: "" },
        nullType: { name: "nullType", contentType: null },
        falseType: { name: "falseType", contentType: false },
        traitType: { name: "traitType", traits: [{ contentType: 0 }, [{ contentType: [] }, {}], { contentType: null }] },
      },
    },
  },
};
