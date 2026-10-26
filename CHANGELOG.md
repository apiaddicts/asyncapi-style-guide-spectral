
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [2.0.0] - 2026-10-26

### Added

- AAR065 - MessageFormat: Message identifiers and names must follow the configured naming convention (default `camelCase`).
- AAR066 - TagsFormat: Tag names must follow the configured naming convention (default `kebab-case`).
- AAR067 - ContentTypeValues: `contentType` and `defaultContentType` must be valid MIME types from the allowed list.
- AAR068 - BindingTypes: Binding keys must be protocols from the allowed list that exist in the document's AsyncAPI version.
- AAR069 - RequiredPropertiesInBindings: Protocol bindings must declare the fields required for their protocol, optionally conditioned on a binding field (`?is=queue`).
- AAR070 - FormatVersionBindings: `bindingVersion` must match the configured pattern (default: a semantic version).
- AAR071 - RequiredExamplesForMessage: Every message must provide at least one example with a `payload`.
- AAR072 - ExampleValidateSchema: Message examples must be valid against the message schemas.
- AAR073 - RequiredTraits: Every message must apply at least one message trait and every configured `required-traits` (default: none).
- AAR074 - PropertiesObjectFormat: Schema property and Avro field names must follow the configured naming convention (default `camelCase`); headers are not checked.
- AAR075 - RequiredInfoAttributes: `info` must declare a non-empty `title`, `version` and `description`.
- AAR076 - RequiredInfoTags: Every Tag object must declare a non-empty `name` and `description`.
- AAR077 - RequiredAttributesContact: `info.contact` must declare a non-empty `name` and `email`.
- AAR078 - RequiredAttributesLicense: `info.license` must declare a non-empty `name` and `url`.
- AAR079 - RequiredAttributesExternalDocs: Every External Documentation object must declare a non-empty `description` and `url`.
- AAR080 - ValidValuesLicenses: The license `name` must be an SPDX license identifier or a `LicenseRef-` identifier.
- AAR081 - ValidServer: Server names must match the configured naming pattern (default: letters, digits, `-` and `_`).
- AAR082 - ServerType: Server names must start with an approved server type, alone or followed by `-` or `_` (default: `eventstreams`, `kafka`).
- AAR083 - ValidServerHost: Server hosts must match the enterprise host pattern (default: `quality.es` or one of its subdomains).
- AAR084 - ValidServerProtocol: Server protocols must be allowed transport protocols (`allowed-protocols`; default: every AsyncAPI protocol, `ibmmq-secure` included).
- AAR085 - ValidServerProtocolVersion: Server `protocolVersion` values must be approved versions (default: `3.3.0`).
- AAR086 - RequiredAttributesServer: Every server must declare a non-empty `url` (2.x) or `host` (3.x), `protocol` and `protocolVersion`.
- AAR087 - RequiredAttributesChannels: Every channel must declare `address` (`null` if dynamic), a non-empty `description` and `messages` (2.x: `description` and a `publish` or `subscribe` operation).
- AAR088 - ValidServerChannels: Every channel must list at least one server of the root `servers` object (AsyncAPI 2.2.0 and later).
- AAR089 - ValidSecurityChannels: Security schemes applied by servers and operations must be of approved types (default: `scramSha512`, `X509`).
- AAR090 - RequiredBindingChannels: Every channel must declare a `kafka` binding.
- AAR091 - ValidAlmostMessageInChannels: A 3.x channel's `messages` must include at least one message.
- AAR092 - RequiredAttributesOperation: Every operation must declare a non-empty `action`, `channel` and `summary` (2.x: `summary`).
- AAR093 - RequiredBindingOperations: Every operation must declare a `kafka` binding, directly or through its traits.
- AAR094 - RequiredOneMessageOperations: Every operation must declare at least one message (2.x: in `message`; a 3.x operation without `messages` takes its channel's).
- Rule documentation with noncompliant and compliant examples for every rule in `docs/resources`.

### Changed

- AAR001 - MandatoryHttpsProtocol: The secure protocol list is now configurable through the `pattern` option (default `^(https|wss|amqps|kafka-secure|secure-mqtt)$`). Backed by the new `asa-server-protocol-secure` function.

## [1.1.0] - 2026-09-20

Consolidates everything shipped across `1.1.0-beta.1` through `1.1.0-beta.5` below.

### Added

- AAR050 - InfoTitleRequired: The `info.title` field must exist and not be empty.
- AAR051 - OperationIdCamelCase: Validates that every operation's `operationId` is present and follows camelCase naming convention.
- AAR052 - AvroNamespacePattern: Validates that the namespace of a named Avro schema (`record`, `enum` or `fixed`) is present and follows the corporate pattern (`org.madrid.<cod_poaps>.<classification>.<domain>` or `org.madrid.common.<domain>`).
- AAR053 - ChannelNamingConvention: Validates that the channel/topic name follows the corporate Kafka-topic naming pattern (`<cod_poaps>.<classification>.<domain>.<origin>.<scope>[.<version>]`).
- AAR054 - ClassificationValidValues: Validates that the channel/topic name's classification segment (2nd segment) is `cdc`, `cmd` or `sys`.
- AAR055 - XPayloadReferencesWellFormed: Validates that the `x-payload-references` extension, wherever it appears, contains `subject`, `ref` and `referenceName` on every item.
- AAR056 - AvroSchemaFormat: When the payload uses Avro, `schemaFormat` must be exactly `application/vnd.apache.avro;version=1.9.0`.
- AAR057 - ErrorTopicDocumented: At least one channel must be documented as an error topic following `<topicOriginal>.[<consumerGroup>.]error.<n>`.
- AAR058 - RetryTopicNamingConvention: If a channel name contains `.retry.`, it must follow `<topicOriginal>.<consumerGroup>.retry.<n>`.
- AAR059 - AvroRecordNameCamelCase: The `name` field of every Avro record (including records nested inside `fields[].type`, unions, arrays and maps) must be in CamelCase with an uppercase first letter.
- AAR060 - ContentTypeAvro: A message's `contentType` (and the document-level `defaultContentType`) must match `application/*+avro` so Confluent's KafkaAvroDeserializer can deserialize the payload.
- AAR061 - ProcessorFunctionNamePaired: Every `x-scs-function-name` must be paired one-to-one between a producing (`publish`/`send`) and a consuming (`subscribe`/`receive`) operation, so the JAPI generator links them into a single processor.
- AAR062 - SubscribeGroupRequired: Each consuming operation (v2 `subscribe`, v3 `action: receive`) must declare a consumer group via `x-scs-group` or `bindings.kafka.groupId`, so the messaging platform can bind it to a durable, load-balanced consumer group.
- AAR063 - AsyncAPIVersionAllowed: The root `asyncapi` version must be one of the versions allowed by the organization. The allow-list is configurable via the `allowedVersions` option (comma-separated); default `2.6.0,3.0.0,3.1.0`.
- AAR064 - KafkaProtocolRequired: In the Kafka context, each server protocol must be `kafka` or `kafka-ssl`; other protocols such as `https` or `wss` are not permitted. Servers defined under `components.servers` are validated as well.
- Unit tests for AAR032, AAR033 and AAR034, each with `fail`/`ok` examples.
- `asa-numeric-format` custom function backing AAR034.

### Changed

- Corrected rule descriptions so they describe what each rule actually validates:
  - AAR001: "HTTPS protocol is mandatory" to "Servers must use a secure protocol" (the rule also accepts `wss`, `amqps`, etc.).
  - AAR012: dropped the misleading "unique" (uniqueness is AAR013's concern; AAR012 only requires the `operationId` to be present).
  - AAR032 / AAR033: "parameters" to "properties", and the restriction list widened to the full set the functions actually accept (`enum`, `const`, `format`).
- AAR032 / AAR033 / AAR034 `given` now also covers AsyncAPI 3 message payloads (`channels[*].messages[*].payload`) and `components.messages[*].payload`, with `resolved: false` so a schema shared via `$ref` is reported once at its definition.
- AAR063 - AsyncAPIVersionAllowed: The default `allowedVersions` value is now `2.6.0,3.0.0,3.1.0`. Organizations that need a narrower allow-list must configure it explicitly.
- AAR060 - ContentTypeAvro: The rule description now states how an absent `contentType` is split between AAR024 and this rule.

### Fixed

- **AAR034 (NumericFormat)** never reported anything: its `given` applied a `[?(@.type === ...)]` filter immediately after `..properties[*]`, which Spectral's JSONPath resolves to zero nodes. Rewritten as the `asa-numeric-format` custom function that checks the property `type` internally.
- AAR051 - OperationIdCamelCase: in AsyncAPI 3.x the operation identifier is its key in the `operations` map, not the `operationId` field that 3.x removed, so that key is now what must follow camelCase.
- AAR024 - MessageValidation: It now validates that every message declares a `contentType` unless it is an Avro message, across AsyncAPI 2.x and 3.x. Backed by the new `asa-message-content-type` function.
- AAR052 - AvroNamespacePattern: Avro schemas inside a `oneOf` are now validated in AsyncAPI 2.x, where `message.oneOf` is a Messages Object. They stay out of scope in AsyncAPI 3.x, whose Message Object has no `oneOf`. This restores parity with the SonarQube engine in both versions.

## [1.1.0-beta.5] - 2026-09-18

### Fixed
- AAR052 - AvroNamespacePattern: Avro schemas inside a `oneOf` are now validated in AsyncAPI 2.x, where `message.oneOf` is a Messages Object. They stay out of scope in AsyncAPI 3.x, whose Message Object has no `oneOf`. This restores parity with the SonarQube engine in both versions.

### Changed
- AAR063 - AsyncAPIVersionAllowed: The default `allowedVersions` value is now `2.6.0,3.0.0,3.1.0`. Organizations that need a narrower allow-list must configure it explicitly.
- AAR060 - ContentTypeAvro: The rule description now states how an absent `contentType` is split between AAR024 and this rule.

## [1.1.0-beta.4] - 2026-09-02

### Fixed
- AAR024 - MessageValidation: It now validates that every message declares a `contentType` unless it is an Avro message, across AsyncAPI 2.x and 3.x. Backed by the new `asa-message-content-type` function.

## [1.1.0-beta.3] - 2026-09-01

### Fixed
- AAR051 - OperationIdCamelCase: in AsyncAPI 3.x the operation identifier is its key in the `operations` map, not the `operationId` field that 3.x removed, so that key is now what must follow camelCase.


## [1.1.0-beta.2] - 2026-08-19

### Added

- AAR060 - ContentTypeAvro: A message's `contentType` (and the document-level `defaultContentType`) must match `application/*+avro` so Confluent's KafkaAvroDeserializer can deserialize the payload.
- AAR061 - ProcessorFunctionNamePaired: Every `x-scs-function-name` must be paired one-to-one between a producing (`publish`/`send`) and a consuming (`subscribe`/`receive`) operation, so the JAPI generator links them into a single processor.
- AAR062 - SubscribeGroupRequired: Each consuming operation (v2 `subscribe`, v3 `action: receive`) must declare a consumer group via `x-scs-group` or `bindings.kafka.groupId`, so the messaging platform can bind it to a durable, load-balanced consumer group.
- AAR063 - AsyncAPIVersionAllowed: The root `asyncapi` version must be one of the versions allowed by the organization. The allow-list is configurable via the `allowedVersions` option (comma-separated); default `2.6.0`.
- AAR064 - KafkaProtocolRequired: In the Kafka context, each server protocol must be `kafka` or `kafka-ssl`; other protocols such as `https` or `wss` are not permitted. Servers defined under `components.servers` are validated as well.

## [1.1.0-beta.1] - 2026-07-15

### Added

- AAR050 - InfoTitleRequired: The `info.title` field must exist and not be empty.
- AAR051 - OperationIdCamelCase: Validates that every operation's `operationId` is present and follows camelCase naming convention.
- AAR052 - AvroNamespacePattern: Validates that the namespace of a named Avro schema (`record`, `enum` or `fixed`) is present and follows the corporate pattern (`org.madrid.<cod_poaps>.<classification>.<domain>` or `org.madrid.common.<domain>`).
- AAR053 - ChannelNamingConvention: Validates that the channel/topic name follows the corporate Kafka-topic naming pattern (`<cod_poaps>.<classification>.<domain>.<origin>.<scope>[.<version>]`).
- AAR054 - ClassificationValidValues: Validates that the channel/topic name's classification segment (2nd segment) is `cdc`, `cmd` or `sys`.
- AAR055 - XPayloadReferencesWellFormed: Validates that the `x-payload-references` extension, wherever it appears, contains `subject`, `ref` and `referenceName` on every item.
- AAR056 - AvroSchemaFormat: When the payload uses Avro, `schemaFormat` must be exactly `application/vnd.apache.avro;version=1.9.0`.
- AAR057 - ErrorTopicDocumented: At least one channel must be documented as an error topic following `<topicOriginal>.[<consumerGroup>.]error.<n>`.
- AAR058 - RetryTopicNamingConvention: If a channel name contains `.retry.`, it must follow `<topicOriginal>.<consumerGroup>.retry.<n>`.
- AAR059 - AvroRecordNameCamelCase: The `name` field of every Avro record (including records nested inside `fields[].type`, unions, arrays and maps) must be in CamelCase with an uppercase first letter.
- Unit tests for AAR032, AAR033 and AAR034, each with `fail`/`ok` examples.
- `asa-numeric-format` custom function backing AAR034.

### Changed

- Corrected rule descriptions so they describe what each rule actually validates:
  - AAR001: "HTTPS protocol is mandatory" to "Servers must use a secure protocol" (the rule also accepts `wss`, `amqps`, etc.).
  - AAR012: dropped the misleading "unique" (uniqueness is AAR013's concern; AAR012 only requires the `operationId` to be present).
  - AAR032 / AAR033: "parameters" to "properties", and the restriction list widened to the full set the functions actually accept (`enum`, `const`, `format`).
- AAR032 / AAR033 / AAR034 `given` now also covers AsyncAPI 3 message payloads (`channels[*].messages[*].payload`) and `components.messages[*].payload`, with `resolved: false` so a schema shared via `$ref` is reported once at its definition.

### Fixed

- **AAR034 (NumericFormat)** never reported anything: its `given` applied a `[?(@.type === ...)]` filter immediately after `..properties[*]`, which Spectral's JSONPath resolves to zero nodes. Rewritten as the `asa-numeric-format` custom function that checks the property `type` internally.

## [1.0.0] - 2025-12-29

### Added

New rules added

- AAR001 - MandatoryHttpsProtocol
- AAR008 - DefinedServer
- AAR009 - DeclaredTag
- AAR010 - DocumentedTag
- AAR011 - DefinedLicense
- AAR012 - DeclaredOperationID
- AAR013 - DuplicateOperationID
- AAR015 - UndefinedContact
- AAR016 - ContactProperties
- AAR017 - UndefinedUrlLicense
- AAR018 - SecuritySchemas
- AAR040 - DefinedChannelServers
- AAR043 - SecurityChannel
- AAR041 - ComponetChannelServer
