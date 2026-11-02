# Class: AuthTokenCache

The caches of verified tokens held by the processors in this process, so ending the sessions of an
account clears its tokens straight away. Other processes keep their entries until their time to
live expires.

## Constructors

### Constructor

> **new AuthTokenCache**(): `AuthTokenCache`

#### Returns

`AuthTokenCache`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### generation() {#generation}

> `static` **generation**(): `number`

Get the number of invalidations so far, compare it before and after verifying a token to know
whether the result may be cached.

#### Returns

`number`

The number of invalidations.

***

### register() {#register}

> `static` **register**(`cache`, `accountKeys`): `void`

Add a cache to clear when the sessions of an account end.

#### Parameters

##### cache

`LfuCache`\<[`IAuthTokenContext`](../interfaces/IAuthTokenContext.md)\>

The cache.

##### accountKeys

`Map`\<`string`, `Set`\<`string`\>\>

The cache keys of the tokens of each account, kept by the owner of the cache.

#### Returns

`void`

***

### unregister() {#unregister}

> `static` **unregister**(`cache`): `void`

Stop clearing a cache.

#### Parameters

##### cache

`LfuCache`\<[`IAuthTokenContext`](../interfaces/IAuthTokenContext.md)\>

The cache.

#### Returns

`void`

***

### track() {#track}

> `static` **track**(`cache`, `accountKeys`, `accountId`, `cacheKey`): `void`

Record the cache key of a token of an account, dropping keys the cache no longer holds.

#### Parameters

##### cache

`LfuCache`\<[`IAuthTokenContext`](../interfaces/IAuthTokenContext.md)\>

The cache.

##### accountKeys

`Map`\<`string`, `Set`\<`string`\>\>

The cache keys of the tokens of each account.

##### accountId

`string`

The account id.

##### cacheKey

`string`

The cache key of the token.

#### Returns

`void`

***

### invalidate() {#invalidate}

> `static` **invalidate**(`accountId`): `void`

Clear the tokens of an account from every cache. Account ids are unique across tenants, so the
tokens are cleared whichever tenant the caller acts in.

#### Parameters

##### accountId

`string`

The account id.

#### Returns

`void`
