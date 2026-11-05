const { linterForRule } = require("../../helpers/utils");
const failExample = require("./AAR056/fail-example");
const okExample = require("./AAR056/ok-example");
const nonStringExample = require("./AAR056/non-string-example");
const wrongCaseExample = require("./AAR056/wrong-case-example");
const wrongFormatExample = require("./AAR056/wrong-format-example");
const mixedExample = require("./AAR056/mixed-example");
const suffixExample = require("./AAR056/suffix-example");
const configuredExample = require("./AAR056/configured-example");

describe("AAR056: Avro schemaFormat must use an allowed version (AsyncAPI 2.x)", () => {
  let linter;

  beforeAll(async () => {
    linter = await linterForRule("asa:AAR056");
  });

  test("Should report one violation per Avro schemaFormat whose version isn't in the default allow-list", async () => {
    const results = await linter.run(failExample);
    expect(results.length).toBe(2);
    results.forEach((r) => expect(r.code).toBe("asa:AAR056"));

    const touched = new Set(results.map((r) => r.path[1]));
    expect(touched).toEqual(new Set(["carga", "schemas"]));
  });

  test("Should pass for the default allowed version 1.9.0 and for non-Avro schemaFormat values", async () => {
    const results = await linter.run(okExample);
    expect(results.length).toBe(0);
  });

  test("Should skip non-string schemaFormat values (number, boolean, null, object, array)", async () => {
    const results = await linter.run(nonStringExample);
    expect(results.length).toBe(0);
  });

  test("Should flag a mis-cased Avro schemaFormat (case-insensitive detection)", async () => {
    const results = await linter.run(wrongCaseExample);
    expect(results.length).toBe(2);
    results.forEach((r) => expect(r.code).toBe("asa:AAR056"));
    const touched = new Set(results.map((r) => r.path[1]));
    expect(touched).toEqual(new Set(["upperCase", "mixedCase"]));
  });

  test("Should flag an Avro schemaFormat with wrong formatting (whitespace, extra parameter)", async () => {
    const results = await linter.run(wrongFormatExample);
    expect(results.length).toBe(2);
    results.forEach((r) => expect(r.code).toBe("asa:AAR056"));
    const touched = new Set(results.map((r) => r.path[1]));
    expect(touched).toEqual(new Set(["whitespace", "charset"]));
  });

  test("Should flag only the wrong-version channel when valid and invalid coexist", async () => {
    const results = await linter.run(mixedExample);
    expect(results.length).toBe(1);
    expect(results[0].code).toBe("asa:AAR056");
    expect(results[0].path[1]).toBe("wrongCarga");
  });
  test("Should pass for +json and +yaml Avro schemaFormat with an allowed version", async () => {
    const results = await linter.run(suffixExample);
    expect(results.length).toBe(0);
  });

  test("Should report versions outside the default allow-list", async () => {
    const results = await linter.run(configuredExample);
    expect(results.length).toBe(3);
    results.forEach((r) => expect(r.code).toBe("asa:AAR056"));
    const touched = new Set(results.map((r) => r.path[1]));
    expect(touched).toEqual(new Set(["avro1110", "avro1120Json", "avro1130"]));
  });

  test("Should pass the configured versions and report the ones not allowed", async () => {
    const configuredLinter = await linterForRule("asa:AAR056", {
      functionOptions: { allowedVersions: "1.9.0,1.11.0,1.12.0" },
    });
    const results = await configuredLinter.run(configuredExample);
    expect(results.length).toBe(1);
    expect(results[0].code).toBe("asa:AAR056");
    expect(results[0].path[1]).toBe("avro1130");
    expect(results[0].message).toBe(
      "AAR056: The 'schemaFormat' value 'application/vnd.apache.avro;version=1.13.0' must be 'application/vnd.apache.avro[+json|+yaml];version=<version>' with a version allowed by the organization (1.9.0, 1.11.0, 1.12.0) when the payload uses Avro."
    );
  });

  test("Should trim spaces and drop empty entries in allowedVersions", async () => {
    const configuredLinter = await linterForRule("asa:AAR056", {
      functionOptions: { allowedVersions: " 1.11.0 , ,1.12.0" },
    });
    const results = await configuredLinter.run(configuredExample);
    expect(results.length).toBe(1);
    expect(results[0].path[1]).toBe("avro1130");
  });

  test("Should report the default version when it is left out of allowedVersions", async () => {
    const configuredLinter = await linterForRule("asa:AAR056", {
      functionOptions: { allowedVersions: "1.11.0" },
    });
    const results = await configuredLinter.run(okExample);
    expect(results.length).toBe(1);
    expect(results[0].path[1]).toBe("carga");
  });
});
