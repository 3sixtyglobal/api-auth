# Class: AccountContextCache

The caches of the account identity and organization held by the processors in this process, so
a change to the account data clears the cached account straight away. Other processes keep their
entry until its time to live expires.

## Constructors

### Constructor

> **new AccountContextCache**(): `AccountContextCache`

#### Returns

`AccountContextCache`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### register() {#register}

> `static` **register**(`cache`): `void`

Add a cache to clear when an account changes.

#### Parameters

##### cache

`LfuCache`\<[`IAuthenticationAccountContext`](../interfaces/IAuthenticationAccountContext.md)\>

The cache.

#### Returns

`void`

***

### unregister() {#unregister}

> `static` **unregister**(`cache`): `void`

Stop clearing a cache.

#### Parameters

##### cache

`LfuCache`\<[`IAuthenticationAccountContext`](../interfaces/IAuthenticationAccountContext.md)\>

The cache.

#### Returns

`void`

***

### key() {#key}

> `static` **key**(`tenantId`, `accountId`): `string`

Get the cache key of an account, account data is partitioned by tenant.

#### Parameters

##### tenantId

`string` \| `undefined`

The tenant id.

##### accountId

`string`

The account id.

#### Returns

`string`

The key.

***

### generation() {#generation}

> `static` **generation**(`key`): `number`

Get the current generation of an account, it changes whenever the account is cleared while a
load is in progress.

#### Parameters

##### key

`string`

The cache key of the account.

#### Returns

`number`

The generation.

***

### loadStarted() {#loadstarted}

> `static` **loadStarted**(`key`): `number`

Record the start of a load of an account.

#### Parameters

##### key

`string`

The cache key of the account.

#### Returns

`number`

The generation of the account when the load started.

***

### loadEnded() {#loadended}

> `static` **loadEnded**(`key`, `generation`): `boolean`

Record the end of a load of an account.

#### Parameters

##### key

`string`

The cache key of the account.

##### generation

`number`

The generation returned when the load started.

#### Returns

`boolean`

True when the account was not cleared during the load, so the result may be stored.

***

### invalidate() {#invalidate}

> `static` **invalidate**(`accountId`): `Promise`\<`void`\>

Clear an account of the current tenant from every cache, and from any load in progress.

#### Parameters

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has been cleared.
