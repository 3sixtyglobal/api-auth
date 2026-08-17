# Class: EntityStorageAuthenticationRateService

Implementation of the authentication rate component using entity storage.

## Implements

- `IAuthenticationRateComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationRateService**(`options?`): `EntityStorageAuthenticationRateService`

Create a new instance of EntityStorageAuthenticationRateService.

#### Parameters

##### options?

[`IEntityStorageAuthenticationRateServiceConstructorOptions`](../interfaces/IEntityStorageAuthenticationRateServiceConstructorOptions.md)

The constructor options.

#### Returns

`EntityStorageAuthenticationRateService`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### registerAction() {#registeraction}

> **registerAction**(`action`, `config`): `Promise`\<`void`\>

Register or update rate-limit configuration for an action.

#### Parameters

##### action

`string`

The action name.

##### config

`IAuthenticationRateActionConfig`

The action configuration.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the action configuration has been stored.

#### Implementation of

`IAuthenticationRateComponent.registerAction`

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

#### Implementation of

`IAuthenticationRateComponent.unregisterAction`

***

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IAuthenticationRateComponent.className`

***

### start() {#start}

> **start**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

The service needs to be started when the application is initialized.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the periodic cleanup task has been registered.

#### Implementation of

`IAuthenticationRateComponent.start`

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

A promise that resolves when the periodic cleanup task has been removed.

#### Implementation of

`IAuthenticationRateComponent.stop`

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

The rate entry id.

#### Implementation of

`IAuthenticationRateComponent.check`

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

#### Implementation of

`IAuthenticationRateComponent.clear`
