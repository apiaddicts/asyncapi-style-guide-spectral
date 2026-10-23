const { largeFleet } = require("../../../helpers/rules/aar001-server-protocol-secure");

module.exports = largeFleet("2.6.0", (host) => ({ url: `${host}.quality.es:9093` }));
