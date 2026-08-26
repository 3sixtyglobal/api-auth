# Interface: ITenantOverrideProcessorConfig

Configuration for the TenantOverrideProcessor.

## Properties

### includeErrorStack? {#includeerrorstack}

> `optional` **includeErrorStack?**: `boolean`

Include the stack with errors.

***

### escalatedPrivilegeRole? {#escalatedprivilegerole}

> `optional` **escalatedPrivilegeRole?**: `string`

The role value that grants escalated privilege for cross-tenant access. Defaults to "global-admin".

***

### authorizationModelId? {#authorizationmodelid}

> `optional` **authorizationModelId?**: `string`

The authorization model ID to use for REST requests.

#### Default

```ts
rest
```
