/**
 * @param {*} schemaFormat - The value found at the schemaFormat key
 * @param {object} options - Configuration options
 * @param {string} options.allowedVersions - Comma-separated list of allowed Avro versions
 * @param {import('@stoplight/spectral-core').RulesetFunctionContext} context
 * @returns {Array} Array of error objects
 */
const AVRO_SCHEMA_FORMAT_PREFIX = "application/vnd.apache.avro";
const DEFAULT_ALLOWED_VERSIONS = "1.9.0";
// Case-sensitive on purpose: detection above is case-insensitive, so a mis-cased,
// spaced or extra-parameter Avro schemaFormat is reported instead of ignored.
const AVRO_SCHEMA_FORMAT = /^application\/vnd\.apache\.avro(?:\+json|\+yaml)?;version=([^;\s]+)$/;

module.exports = (schemaFormat, options, context) => {
  if (typeof schemaFormat !== "string" || !schemaFormat.toLowerCase().includes(AVRO_SCHEMA_FORMAT_PREFIX)) {
    return [];
  }

  const configured =
    options && options.allowedVersions != null
      ? options.allowedVersions
      : DEFAULT_ALLOWED_VERSIONS;
  const allowed = String(configured)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "");

  const match = AVRO_SCHEMA_FORMAT.exec(schemaFormat);
  if (match && allowed.includes(match[1])) {
    return [];
  }

  return [
    {
      message: `The 'schemaFormat' value '${schemaFormat}' must be 'application/vnd.apache.avro[+json|+yaml];version=<version>' with a version allowed by the organization (${allowed.join(", ")}) when the payload uses Avro.`,
      path: [...context.path],
    },
  ];
};
