const { Spectral } = require("@stoplight/spectral-core");
const { migrateRuleset } = require("@stoplight/spectral-ruleset-migrator");
const fs = require("fs");
const path = require("path");

const AsyncFunction = (async () => {}).constructor;
const rulesetFile = path.resolve(__dirname, "../../asa-spectral.yaml");

/**
 * Creates a Spectral linter instance configured for a single rule.
 *
 * @param {string} rule - The rule name (e.g., 'asa:AAR001')
 * @param {object} [opts] - Optional overrides
 * @returns {Promise<Spectral>} Configured Spectral linter
 */
async function linterForRule(rule, opts = {}) {
  const linter = new Spectral();

  const m = {};
  const paths = [path.dirname(rulesetFile), __dirname, path.resolve(__dirname, "../..")];

  await AsyncFunction(
    "module, require",
    await migrateRuleset(rulesetFile, {
      format: "commonjs",
      fs,
    })
  )(m, (text) => require(require.resolve(text, { paths })));

  const ruleset = m.exports;
  delete ruleset.extends;

  // Keep only the specified rule
  Object.keys(ruleset.rules).forEach((key) => {
    if (key !== rule) {
      delete ruleset.rules[key];
    }
  });

  // Apply option overrides if provided
  if (opts.functionOptions && ruleset.rules[rule] && ruleset.rules[rule].then) {
    ruleset.rules[rule].then.functionOptions = {
      ...ruleset.rules[rule].then.functionOptions,
      ...opts.functionOptions,
    };
  }

  linter.setRuleset(ruleset);
  return linter;
}

const traitRef = (name) => ({ $ref: `#/components/messageTraits/${name}` });

const chars = (...codes) => String.fromCharCode(...codes);

module.exports = {
  linterForRule,
  traitRef,
  chars,
};
