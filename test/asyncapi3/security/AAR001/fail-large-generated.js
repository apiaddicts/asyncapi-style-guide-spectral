const { largeFleet } = require("../../../helpers/rules/aar001-server-protocol-secure");

module.exports = largeFleet("3.0.0", (host) => ({ host: `${host}.quality.es:9093` }));
