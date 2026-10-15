const { casing } = require("@stoplight/spectral-functions");

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

module.exports = {
  CASING_TYPES,
  CASING_VALUES,
  isValidCasing,
};
