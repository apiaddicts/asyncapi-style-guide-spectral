# APIAddicts AsyncAPI Style Guide - Spectral Ruleset

[![Node.js CI](https://github.com/apiaddicts/apquality-spectral/actions/workflows/node.js.yml/badge.svg)](https://github.com/apiaddicts/apquality-spectral/actions/workflows/node.js.yml) ![Coverage](./coverage/badges.svg)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](LICENSE)

Spectral rules for **AsyncAPI 2.x and 3.x** definitions, managed by [ApiQuality](https://apiquality.io) and provided to the [APIAddicts](https://apiaddicts.org) community.

Based on the SonarQube rules from [sonarasyncapi-rules](https://github.com/apiaddicts/sonarasyncapi-rules) and following the same conventions as [apiaddicts-style-guide-spectral](https://github.com/apiaddicts/apiaddicts-style-guide-spectral) (OpenAPI).

---

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- Spectral CLI: `npm install -g @stoplight/spectral-cli`

### Installation

```bash
# Clone the repository
git clone https://github.com/apiaddicts/apiaddicts-asyncapi-style-guide-spectral.git
cd apiaddicts-asyncapi-style-guide-spectral
npm install
```

### Usage

#### Command Line

```bash
# Lint a local AsyncAPI file
spectral lint -r asa-spectral.yaml your-asyncapi.yaml

# Lint using remote ruleset
spectral lint -r https://raw.githubusercontent.com/apiaddicts/apiaddicts-asyncapi-style-guide-spectral/main/asa-spectral.yaml your-asyncapi.yaml
```

#### Spectral Config File

Create a `.spectral.yaml` in your project root:

```yaml
extends:
  - https://raw.githubusercontent.com/apiaddicts/apiaddicts-asyncapi-style-guide-spectral/main/asa-spectral.yaml
```

Then run:

```bash
spectral lint your-asyncapi.yaml
```

#### VSCode Extension

1. Install the [Spectral VSCode extension](https://marketplace.visualstudio.com/items?itemName=stoplight.spectral).
2. Create a `.spectral.yaml` file as shown above.
3. Open any AsyncAPI YAML/JSON file for real-time linting.

---

## Rules Reference

### Security Rules

| Rule | Severity | Description |
|------|----------|-------------|
| **AAR001** | `error` | A secure protocol (https, wss, amqps, etc.) is mandatory for all servers. |
| **AAR008** | `error` | The `servers` section must be defined in the AsyncAPI document. |
| **AAR018** | `warn` | Security schemes must be among allowed types and must be complete (all required fields). |
| **AAR043** | `warn` | Each channel operation should define a security scheme. |
| **AAR064** | `error` | In the Kafka context, each server protocol must be `kafka` or `kafka-ssl` (not `https`, `wss`, etc.). |

### Operations Rules

| Rule | Severity | Description |
|------|----------|-------------|
| **AAR009** | `error` | Each operation (publish/subscribe) must declare at least one tag. |
| **AAR010** | `warn` | All tags should have a `description` field. |
| **AAR040** | `warn` | Channel servers must reference servers defined in the root `servers` object. |
| **AAR041** | `info` | Servers and channels should be defined in `components` for reusability. |
| **AAR053** | `error` | Channel/topic name must follow the corporate naming pattern `<cod_poaps>.<classification>.<domain>.<origin>.<scope>[.<version>]`. |
| **AAR054** | `error` | Channel/topic classification (2nd segment) must be `cdc`, `cmd` or `sys`. |
| **AAR057** | `error` | At least one channel must be documented as an error topic following `<topicOriginal>.[<consumerGroup>.]error.<n>`. |
| **AAR058** | `warn` | If a channel name contains `.retry.`, it must follow `<topicOriginal>.<consumerGroup>.retry.<n>`. |
| **AAR061** | `warn` | Producing and consuming operations must share the same `x-scs-function-name` so the JAPI generator links them as one processor. |
| **AAR062** | `error` | Each consuming operation (v2 `subscribe`, v3 `receive`) must declare a consumer group via `x-scs-group` or `bindings.kafka.groupId`. |

### Format / Documentation Rules

| Rule | Severity | Description |
|------|----------|-------------|
| **AAR011** | `warn` | License should be documented in `info.license`. |
| **AAR012** | `warn` | Each operation must have a unique `operationId`. |
| **AAR013** | `error` | No two operations may share the same `operationId`. |
| **AAR015** | `warn` | The `info` object must contain a `contact` section. |
| **AAR016** | `warn` | Contact must include `name`, `url`, and `email` fields. |
| **AAR017** | `warn` | The `license` object must have a `url` field. |
| **AAR019** | `warn` | The AsyncAPI document should define an `id` field. |
| **AAR021** | `warn` | Each operation must have a `summary` field. |
| **AAR022** | `warn` | Operation `description` must differ from its `summary`. |
| **AAR029** | `warn` | Each channel and operation must have a `description`. |
| **AAR032** | `warn` | Numeric properties must declare a value restriction (`minimum`, `maximum`, `format`, `enum` or `const`). |
| **AAR033** | `warn` | String properties must declare a value restriction (`minLength`, `maxLength`, `pattern`, `enum`, `const` or `format`). |
| **AAR034** | `warn` | Numeric types must specify a valid `format` (int32, int64, float, double). |
| **AAR035** | `info` | Messages should have a `title` field. |
| **AAR036** | `warn` | Descriptions must begin with a capital letter and end with a period. |
| **AAR037** | `warn` | Bindings must specify a `bindingVersion`. |
| **AAR042** | `info` | Messages should have a unique `messageId` identifier. |
| **AAR050** | `error` | The `info.title` field must exist and not be empty. |
| **AAR051** | `error` | Every operation's `operationId` must be present and follow camelCase naming convention. |
| **AAR063** | `error` | The root `asyncapi` version must be one of the versions allowed by the organization (configurable via `allowedVersions`; default `2.6.0,3.0.0,3.1.0`). |
| **AAR065** | `warn` | Message identifiers and names (`messageId` and `name` in 2.x, message key and `name` in 3.x) must follow the configured `naming-convention`: `camelCase` (default), `snake_case`, `kebab-case` or `PascalCase`. |
| **AAR066** | `warn` | Tag names must follow the configured `naming-convention`: `kebab-case` (default), `camelCase`, `snake_case` or `PascalCase`. |

### Schema Rules

| Rule | Severity | Description |
|------|----------|-------------|
| **AAR024** | `error` | Every message must declare a `contentType` unless it is an Avro message (auto-detected via `schemaFormat`). |
| **AAR026** | `info` | Message schemas should be defined in `components.messages` and referenced via `$ref`. |
| **AAR031** | `warn` | Message examples must follow the declared payload and headers schemas. |
| **AAR052** | `error` | The namespace of a named Avro schema (record, enum or fixed) is required and must follow the corporate pattern. |
| **AAR055** | `warn` | The `x-payload-references` extension, wherever it appears, must have `subject`, `ref` and `referenceName` on every item. |
| **AAR056** | `error` | When the payload uses Avro, `schemaFormat` must be exactly `application/vnd.apache.avro;version=1.9.0`. |
| **AAR059** | `error` | The `name` field of every Avro record (including nested records) must be in CamelCase with an uppercase first letter. |
| **AAR060** | `error` | A message's `contentType` (and the document-level `defaultContentType`) must match `application/*+avro`. |

---

## AsyncAPI Version Support

All rules support **AsyncAPI 2.x** by default. Rules that differ structurally for **AsyncAPI 3.x** have dedicated `-v3` variants that are automatically applied based on the document format. Key differences handled:

- **AsyncAPI 2.x**: Operations are under `channels[*].publish` / `channels[*].subscribe`
- **AsyncAPI 3.x**: Operations are under `operations[*]` (top-level)

---

## Custom Functions

The ruleset includes 27 custom Spectral functions for complex validation logic:

| Function | Used by | Purpose |
|----------|---------|---------|
| `asa-check-security-schemes` | AAR018 | Validates security scheme types and completeness |
| `asa-description-format` | AAR036 | Checks description starts uppercase, ends with period |
| `asa-duplicate-operation-id` | AAR013 | Detects duplicate operationId values across channels |
| `asa-operation-id-camel-case` | AAR051 | Checks operationId is present and follows camelCase |
| `asa-message-content-type` | AAR024 | Validates each message declares a contentType unless it is Avro |
| `asa-message-examples-validation` | AAR031 | Validates message examples against schemas |
| `asa-numeric-parameter-integrity` | AAR032 | Checks numeric properties have constraints |
| `asa-numeric-format` | AAR034 | Checks numeric properties declare a valid format |
| `asa-string-parameter-integrity` | AAR033 | Checks string properties have constraints |
| `asa-channel-servers-defined` | AAR040 | Validates channel server references exist |
| `asa-binding-version` | AAR037 | Checks bindings have bindingVersion |
| `asa-message-schemas-in-components` | AAR026 | Recommends $ref usage for message schemas |
| `asa-avro-namespace-pattern` | AAR052 | Validates Avro namespace against the corporate pattern |
| `asa-channel-naming-convention` | AAR053 | Validates channel/topic name against the corporate topic naming pattern |
| `asa-classification-valid-values` | AAR054 | Validates that the channel/topic classification segment is cdc, cmd or sys |
| `asa-x-payload-references-well-formed` | AAR055 | Validates that x-payload-references items each have subject, ref and referenceName |
| `asa-avro-schema-format` | AAR056 | Validates that an Avro schemaFormat is exactly application/vnd.apache.avro;version=1.9.0 |
| `asa-error-topic-documented` | AAR057 | Validates that at least one channel is documented as an error topic |
| `asa-retry-topic-naming-convention` | AAR058 | Validates that retry channels follow the required retry-topic naming pattern |
| `asa-avro-record-name-camel-case` | AAR059 | Validates that every Avro record's `name` (including nested records) is in CamelCase |
| `asa-content-type-avro` | AAR060 | Validates that every message `contentType` and the `defaultContentType` match `application/*+avro` |
| `asa-processor-function-name-paired` | AAR061 | Validates that producing and consuming operations share the same `x-scs-function-name` |
| `asa-subscribe-group-required` | AAR062 | Validates that each consuming operation declares a consumer group |
| `asa-asyncapi-version-allowed` | AAR063 | Validates that the root `asyncapi` version is one of the allowed versions |
| `asa-kafka-protocol-required` | AAR064 | Validates that each server protocol is `kafka` or `kafka-ssl` |
| `asa-message-format` | AAR065 | Checks the casing of message identifiers and names |
| `asa-tags-format` | AAR066 | Checks the casing of tag names |

---

## Project Structure

```
apiaddicts-asyncapi-style-guide-spectral/
├── .github/workflows/       # CI/CD configuration
├── functions/               # Custom Spectral rule functions
│   ├── asa-avro-namespace-pattern.js
│   ├── asa-binding-version.js
│   ├── asa-channel-naming-convention.js
│   ├── asa-channel-servers-defined.js
│   ├── asa-check-security-schemes.js
│   ├── asa-description-format.js
│   ├── asa-duplicate-operation-id.js
│   ├── asa-message-examples-validation.js
│   ├── asa-message-schemas-in-components.js
│   ├── asa-numeric-parameter-integrity.js
│   ├── asa-string-parameter-integrity.js
│   ├── asa-content-type-avro.js
│   ├── asa-avro-record-name-camel-case.js
│   ├── asa-error-topic-documented.js
│   ├── asa-avro-schema-format.js
│   ├── asa-string-parameter-integrity.js
│   ├── asa-classification-valid-values.js
│   ├── asa-x-payload-references-well-formed.js
│   └── asa-retry-topic-naming-convention.js
├── test/
│   ├── helpers/utils.js     # Test utilities
│   ├── asyncapi2/           # AsyncAPI 2.x tests
│   │   ├── security/        # Security rule tests
│   │   ├── operations/      # Operations rule tests
│   │   ├── format/          # Format/documentation tests
│   │   └── schemas/         # Schema rule tests
│   └── asyncapi3/           # AsyncAPI 3.x tests
│       ├── operations/      # Operations rule tests
│       ├── format/          # Format/documentation tests
│       └── schemas/         # Schema rule tests
├── asa-spectral.yaml        # Main Spectral ruleset
├── package.json
├── CONTRIBUTING.md
└── README.md
```

---

## Running Tests

```bash
# Run all tests with coverage
npm test

# Run a specific test file
npx jest test/asyncapi2/security/aar001.test.js
```

---

## Mapping to SonarQube Rules

This Spectral ruleset is a direct translation of the [sonarasyncapi-rules](https://github.com/apiaddicts/sonarasyncapi-rules) SonarQube plugin. The mapping is:

| SonarQube Rule | Spectral Rule | SonarQube Type | SonarQube Severity |
|----------------|---------------|----------------|-------------------|
| AAR001 | `asa:AAR001` | VULNERABILITY | CRITICAL |
| AAR008 | `asa:AAR008` | VULNERABILITY | CRITICAL |
| AAR009 | `asa:AAR009` | BUG | BLOCKER |
| AAR010 | `asa:AAR010` | BUG | MAJOR |
| AAR011 | `asa:AAR011` | BUG | MAJOR |
| AAR012 | `asa:AAR012` | BUG | MAJOR |
| AAR013 | `asa:AAR013` | BUG | MAJOR |
| AAR015 | `asa:AAR015` | BUG | MAJOR |
| AAR016 | `asa:AAR016` | BUG | MAJOR |
| AAR017 | `asa:AAR017` | BUG | MAJOR |
| AAR018 | `asa:AAR018` | VULNERABILITY | MAJOR |
| AAR019 | `asa:AAR019` | BUG | MAJOR |
| AAR021 | `asa:AAR021` | BUG | MAJOR |
| AAR022 | `asa:AAR022` | BUG | MAJOR |
| AAR024 | `asa:AAR024` | BUG | MAJOR |
| AAR026 | `asa:AAR026` | BUG | MAJOR |
| AAR029 | `asa:AAR029` | BUG | MAJOR |
| AAR031 | `asa:AAR031` | BUG | MAJOR |
| AAR032 | `asa:AAR032` | BUG | MAJOR |
| AAR033 | `asa:AAR033` | BUG | MAJOR |
| AAR034 | `asa:AAR034` | BUG | MAJOR |
| AAR035 | `asa:AAR035` | BUG | MAJOR |
| AAR036 | `asa:AAR036` | BUG | MAJOR |
| AAR037 | `asa:AAR037` | BUG | MAJOR |
| AAR040 | `asa:AAR040` | BUG | MAJOR |
| AAR041 | `asa:AAR041` | BUG | MAJOR |
| AAR042 | `asa:AAR042` | BUG | MAJOR |
| AAR043 | `asa:AAR043` | VULNERABILITY | MAJOR |
| AAR050 | `asa:AAR050` | BUG | MAJOR |
| AAR051 | `asa:AAR051` | BUG | MAJOR |
| AAR052 | `asa:AAR052` | BUG | MAJOR |
| AAR053 | `asa:AAR053` | BUG | MAJOR |
| AAR054 | `asa:AAR054` | BUG | MAJOR |
| AAR055 | `asa:AAR055` | BUG | MAJOR |
| AAR056 | `asa:AAR056` | BUG | MAJOR |
| AAR057 | `asa:AAR057` | BUG | MAJOR |
| AAR058 | `asa:AAR058` | BUG | MINOR |
| AAR059 | `asa:AAR059` | BUG | MAJOR |
| AAR060 | `asa:AAR060` | BUG | MAJOR |
| AAR061 | `asa:AAR061` | BUG | MINOR |
| AAR062 | `asa:AAR062` | BUG | MAJOR |
| AAR063 | `asa:AAR063` | BUG | MAJOR |
| AAR064 | `asa:AAR064` | VULNERABILITY | CRITICAL |

---

## Related Projects

- [apiaddicts-style-guide-spectral](https://github.com/apiaddicts/apiaddicts-style-guide-spectral) - Spectral rules for OpenAPI (OAR rules)
- [sonarasyncapi-rules](https://github.com/apiaddicts/sonarasyncapi-rules) - SonarQube plugin for AsyncAPI (source rules)
- [SonarAPI Rules](https://github.com/apiaddicts/sonarapi-rules) - SonarQube plugin for OpenAPI

---

## License

This project is licensed under the [GPL-3.0 License](LICENSE).

---

## Contributors

Managed by [ApiQuality](https://apiquality.io) for the [APIAddicts](https://apiaddicts.org) community.

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
