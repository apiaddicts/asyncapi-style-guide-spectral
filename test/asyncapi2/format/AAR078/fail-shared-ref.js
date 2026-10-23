module.exports = {
  asyncapi: "2.6.0",
  id: "urn:geodata:map-tiles",
  info: { $ref: "#/components/x-shared-info/mapTilesAlias" },
  defaultContentType: "application/json",
  servers: {
    tilesKafka: {
      url: "kafka.tiles.geodata.example.io:9093",
      protocol: "kafka-secure",
      description: "Map tile backbone.",
      bindings: { kafka: { schemaRegistryUrl: "https://registry.tiles.geodata.example.io", bindingVersion: "0.4.0" } },
    },
  },
  channels: {
    "tiles.cdc.vector.rendered.v1": {
      description: "Vector tiles rendered for a zoom level.",
      publish: {
        operationId: "publishTileRendered",
        summary: "The renderer publishes rendered tiles.",
        message: { $ref: "#/components/messages/tileRendered" },
      },
      subscribe: {
        operationId: "receiveTileRendered",
        summary: "The CDN invalidator receives rendered tiles.",
        message: { $ref: "#/components/messages/tileRendered" },
      },
    },
  },
  components: {
    messages: {
      tileRendered: {
        name: "tileRendered",
        title: "Tile rendered",
        payload: {
          type: "object",
          properties: {
            z: { type: "integer", minimum: 0, maximum: 22 },
            x: { type: "integer", minimum: 0 },
            y: { type: "integer", minimum: 0 },
            attribution: { $ref: "#/components/x-licenses/attribution" },
          },
        },
      },
    },
    "x-shared-info": {
      mapTilesAlias: { $ref: "#/components/x-shared-info/mapTiles" },
      mapTiles: {
        title: "Map Tile Events",
        version: { $ref: "#/components/x-texts/version" },
        description: "Vector and raster tile rendering events of the map platform.",
        license: { $ref: "#/components/x-licenses/openDataAlias" },
      },
    },
    "x-licenses": {
      openDataAlias: { $ref: "#/components/x-licenses/openData" },
      openData: {
        name: { $ref: "#/components/x-texts/nameLoopA" },
        identifier: "ODbL-1.0",
        Url: "https://opendatacommons.org/licenses/odbl/1-0/",
        "x-url": { $ref: "#/components/x-texts/odblUrl" },
      },
      attribution: { name: "ODbL 1.0", url: "https://opendatacommons.org/licenses/odbl/1-0/" },
      unused: { name: "", url: "" },
    },
    "x-texts": {
      version: "5.1.0",
      odblUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
      nameLoopA: { $ref: "#/components/x-texts/nameLoopB" },
      nameLoopB: { $ref: "#/components/x-texts/nameLoopA" },
    },
  },
};
