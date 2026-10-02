const { Spectral } = require("@stoplight/spectral-core");
const { casing } = require("@stoplight/spectral-functions");
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

const CASING_TYPES = ["camel", "pascal", "kebab", "snake"];

const CASING_VALUES = [
  "a",
  "A",
  "user",
  "User",
  "USER",
  "usersignedup",
  "userSignedUp",
  "userSignedUpV2",
  "userId",
  "userID",
  "user2fa",
  "user2Fa",
  "user2FA",
  "UserSignedUp",
  "User2Fa",
  "UserID",
  "user-signed-up",
  "user-2fa",
  "user2-fa",
  "user--signed",
  "user-Signed",
  "user_signed_up",
  "user_2fa",
  "user__signed",
  "USER_SIGNED_UP",
  "USER_2FA",
  "USER-SIGNED-UP",
  "USER-2FA",
  "User_Signed_Up",
  "User-Signed-Up",
  "user_signed-up",
  "-user",
  "user-",
  "_user",
  "user_",
  "2user",
  "user signed up",
  " user",
  "user ",
  "user.signed.up",
  "user/signed",
  "user:signed",
  "usér",
  "ÜserSigned",
  "user$",
  "",
];

/**
 * @param {string} value - The value to check
 * @param {string} type - The casing type (e.g., 'camel')
 * @returns {boolean} Whether the value follows the casing type
 */
const isValidCasing = (value, type) => value !== "" && casing(value, { type }, {}) === undefined;

module.exports.linterForRule = linterForRule;
module.exports.CASING_TYPES = CASING_TYPES;
module.exports.CASING_VALUES = CASING_VALUES;
module.exports.isValidCasing = isValidCasing;
