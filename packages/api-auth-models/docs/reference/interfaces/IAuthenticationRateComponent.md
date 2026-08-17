# Interface: IAuthenticationRateComponent

Contract definition for authentication rate component.

## Extends

- `IComponent`

## Methods

### start() {#start}

> **start**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

The service needs to be started when the application is initialized.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the service has been started.

#### Overrides

`IComponent.start`

***

### stop() {#stop}

> **stop**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

The component needs to be stopped when the node is closed.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the service has been stopped.

#### Overrides

`IComponent.stop`

***

### registerAction() {#registeraction}

> **registerAction**(`action`, `config`): `Promise`\<`void`\>

Register or update rate-limit configuration for an action.

#### Parameters

##### action

`string`

The action name.

##### config

[`IAuthenticationRateActionConfig`](IAuthenticationRateActionConfig.md)

The action configuration.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the action configuration has been stored.

***

### unregisterAction() {#unregisteraction}

> **unregisterAction**(`action`): `Promise`\<`void`\>

Unregister rate-limit configuration for an action.

#### Parameters

##### action

`string`

The action name.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the action configuration has been removed.

***

### check() {#check}

> **check**(`action`, `identifier`): `Promise`\<`string`\>

Check the authentication rate for a given action and identifier.

#### Parameters

##### action

`string`

The action to be checked.

##### identifier

`string`

The identifier to be checked.

#### Returns

`Promise`\<`string`\>

The result of the rate check.

***

### clear() {#clear}

> **clear**(`action`, `identifier`): `Promise`\<`void`\>

Clear the authentication rate entry for the given action and identifier.

#### Parameters

##### action

`string`

The action to clear.

##### identifier

`string`

The identifier to clear.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the rate entry has been removed.
