const AREAS = ["hvac", "lighting", "access-control", "elevators", "fire-safety", "parking"];
const CHANNEL_COUNT = 300;

const channels = {};
const operations = {};
const expectedPaths = [];

for (let i = 0; i < CHANNEL_COUNT; i++) {
  const area = AREAS[i % AREAS.length];
  const channelKey = `${area.replace("-", "")}Channel${i}`;
  const channelTag = i % 9 === 0 ? `${area}_${i}` : `${area}-${i}`;
  const messageTag = i % 12 === 0 ? `${area.toUpperCase()}` : `${area}-events`;
  const operationTag = i % 15 === 0 ? `${area} operations` : `${area}-operations`;

  channels[channelKey] = {
    address: i % 5 === 0 ? null : `buildings/${area}/${i}`,
    tags: [{ name: area }, { name: channelTag }],
    messages: {
      reading: { tags: [{ name: messageTag }, { $ref: "#/components/tags/shared" }] },
      alarm: { $ref: "#/components/messages/alarm" },
    },
  };
  operations[`send${i}`] = {
    action: "send",
    channel: { $ref: `#/channels/${channelKey}` },
    tags: [{ name: operationTag }, { $ref: "#/components/tags/shared" }],
  };

  if (i % 9 === 0) expectedPaths.push(["channels", channelKey, "tags", "1", "name"].join("."));
  if (i % 12 === 0) expectedPaths.push(["channels", channelKey, "messages", "reading", "tags", "0", "name"].join("."));
  if (i % 15 === 0) expectedPaths.push(["operations", `send${i}`, "tags", "0", "name"].join("."));
}

expectedPaths.push("components.tags.shared.name", "components.messages.alarm.tags.0.name");

module.exports = {
  document: {
    asyncapi: "3.0.0",
    info: {
      title: "Building Event Backbone",
      version: "3.0.0",
      description: "Generated document with 300 channels, 300 operations and more than 2,000 tags.",
      tags: AREAS.map((name) => ({ name })),
    },
    channels,
    operations,
    components: {
      messages: { alarm: { tags: [{ name: "Alarm Raised" }] } },
      tags: { shared: { name: "SharedTag" } },
    },
  },
  expectedPaths: expectedPaths.sort(),
};
