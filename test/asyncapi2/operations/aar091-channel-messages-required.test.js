const { linterForRule } = require("../../helpers/utils");
const {
  NAMES,
  findingsFor,
  messageRef,
  shapesFor,
  channelComponentsFor,
  ENTRY_VALUE_CASES,
  MESSAGES_VALUE_CASES,
  MESSAGE_VALUE_CASES,
  channelObjectCasesV2,
  IGNORED_OPTIONS,
} = require("../../helpers/rules/aar091-channel-messages-required");
const okExample = require("./AAR091/ok-example");
const failExample = require("./AAR091/fail-example");
const failSharedRef = require("./AAR091/fail-shared-ref");
const okStructuralEdges = require("./AAR091/ok-structural-edges");
const failLargeGenerated = require("./AAR091/fail-large-generated");

const RULE = "asa:AAR091";
const OMIT = Symbol("omit");
const NAME = NAMES[2];
const v3Findings = findingsFor();
const { complete, minimal } = shapesFor(2);
const COMPONENTS = channelComponentsFor(2);

const byPath = (a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]);
const only = (results) => results.filter((r) => r.code === RULE);
const findingsOf = (results) => only(results).map((r) => [r.path.join("."), r.message]).sort(byPath);
const withVersion = (doc, version) => ({ ...doc, asyncapi: version });

const base = (channels, extra = {}) => ({
  asyncapi: "2.6.0",
  info: { title: "Quality Order Events", version: "4.2.0" },
  servers: { production: { url: "kafka.quality.es:9093", protocol: "kafka-secure", protocolVersion: "3.3.0" } },
  ...(channels === OMIT ? {} : { channels }),
  components: COMPONENTS,
  ...extra,
});
const withChannel = (channel) => base({ [NAME]: channel });
const withMessage = (operation, value) => withChannel({ description: "Orders placed.", [operation]: { operationId: "order", message: value } });

const ALL_MESSAGE_CASES = [...ENTRY_VALUE_CASES, ...MESSAGE_VALUE_CASES];

describe("AAR091 (AsyncAPI 2.x): 2.x channels have no messages map, so nothing is reported and AAR087 and AAR094 check their operations", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule(RULE);
  });

  test("reports nothing on a realistic multi-protocol document whose channels carry messages", async () => {
    expect(findingsOf(await linter.run(okExample))).toEqual([]);
  });

  test("reports nothing on channels of channels and components.channels without operations, without a usable message or unusable, which AAR087 and AAR094 report", async () => {
    expect(findingsOf(await linter.run(failExample))).toEqual([]);
    expect(findingsOf(await linter.run(failSharedRef))).toEqual([]);
  });

  test.each(["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0", "2.5.0", "2.6.0"])("reports nothing on AsyncAPI %s", async (version) => {
    expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(failSharedRef, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okExample, version)))).toEqual([]);
    expect(findingsOf(await linter.run(withVersion(okStructuralEdges, version)))).toEqual([]);
  });

  test("reports nothing whenever the asyncapi value does not start with a major version of 3 or more", async () => {
    for (const version of [2, "2", "2.6", " 2.6.0 ", "2.7.0", "1.2.0", "latest", "v3.0.0", "", null, false, {}, []]) {
      expect(findingsOf(await linter.run(withVersion(failExample, version)))).toEqual([]);
      expect(findingsOf(await linter.run(withVersion(base({ [NAME]: { messages: {} }, empty: {} }), version)))).toEqual([]);
    }
  });

  test("reads the messages map instead when the asyncapi value starts with a major version of 3 or more", async () => {
    for (const version of [3, "3", "3.0.0", "3.1.0", " 3.1.0", "4.0.0"]) {
      const doc = withVersion(base({ [NAME]: minimal, modern: { address: "orders.placed", messages: { orderPlaced: messageRef("orderPlaced") } }, empty: {}, emptyMap: { address: "orders.empty", messages: {} } }), version);
      expect(findingsOf(await linter.run(doc))).toEqual(v3Findings([["channels.emptyMap.messages", "empty", "emptyMap"]]));
    }
  });

  describe("message values", () => {
    test.each(ALL_MESSAGE_CASES)("the only operation message set to %s is never reported", async (_, value) => {
      for (const operation of ["publish", "subscribe"]) {
        expect(findingsOf(await linter.run(withMessage(operation, value)))).toEqual([]);
      }
    });

    test.each(ENTRY_VALUE_CASES)("the only oneOf item set to %s is never reported", async (_, value) => {
      expect(findingsOf(await linter.run(withMessage("subscribe", { oneOf: [value] })))).toEqual([]);
    });

    test.each(MESSAGES_VALUE_CASES)("an AsyncAPI 3.x messages field set to %s is never read", async (_, value) => {
      expect(findingsOf(await linter.run(withChannel({ description: "Orders placed.", messages: value })))).toEqual([]);
    });
  });

  describe("channel object", () => {
    test.each(channelObjectCasesV2())("%s is never reported", async (_, channel) => {
      expect(findingsOf(await linter.run(withChannel(channel)))).toEqual([]);
    });

    test("never reports the channels of components.channels or of maps given as references either", async () => {
      const channels = { shared: { subscribe: { message: { oneOf: [null] } } }, gone: null, fine: complete, silent: { description: "Silent." }, map: { messages: {} } };
      expect(findingsOf(await linter.run(base(OMIT, { components: { ...COMPONENTS, channels } })))).toEqual([]);
      expect(findingsOf(await linter.run(base({ $ref: "#/x-channel-map" }, { "x-channel-map": channels })))).toEqual([]);
    });
  });

  describe("functionOptions", () => {
    test.each(IGNORED_OPTIONS)("injecting %s changes nothing: 2.x documents stay unreported", async (_, functionOptions) => {
      const custom = await linterForRule(RULE, { functionOptions });
      expect(findingsOf(await custom.run(failExample))).toEqual([]);
      expect(findingsOf(await custom.run(failSharedRef))).toEqual([]);
      expect(findingsOf(await custom.run(okExample))).toEqual([]);
    });
  });

  test("does not inspect a document without the asyncapi field", async () => {
    const { asyncapi, ...withoutVersion } = failExample;
    expect(asyncapi).toBe("2.6.0");
    expect(findingsOf(await linter.run(withoutVersion))).toEqual([]);
    expect(findingsOf(await linter.run({ channels: { a: {} } }))).toEqual([]);
  });

  test("returns no results for non-object documents", async () => {
    expect(findingsOf(await linter.run("42"))).toEqual([]);
    expect(findingsOf(await linter.run([{ asyncapi: "2.6.0", channels: { a: {} } }]))).toEqual([]);
  });

  test("handles a very large 2.x document full of channel defects and reports none of them", async () => {
    expect(failLargeGenerated.defects.length).toBeGreaterThan(100);
    expect(findingsOf(await linter.run(failLargeGenerated.document))).toEqual([]);
  });
});
