# Interface: IAuthHeaderProcessorConfig

Configuration for the authentication header processor

## Properties

### signingKeyName? {#signingkeyname}

> `optional` **signingKeyName?**: `string`

The name of the key to retrieve from the vault for signing JWT.

#### Default

```ts
auth-signing
```

***

### cookieName? {#cookiename}

> `optional` **cookieName?**: `string`

The name of the cookie to use for the token.

#### Default

```ts
access_token
```

***

### includeErrorStack? {#includeerrorstack}

> `optional` **includeErrorStack?**: `boolean`

Include the stack with errors.

***

### tokenCacheTtlMs? {#tokencachettlms}

> `optional` **tokenCacheTtlMs?**: `number`

The time in milliseconds a verified token is kept in the in-memory cache, counted from when it
was verified and not extended by use, set to 0 to disable caching. A hit skips the vault
signature check, the tenant lookup and the user lookup, so this is also the longest a password
change, a user removal or a signing key rotation can go unnoticed. An entry never outlives the
expiry claim of its own token either.

#### Default

```ts
30000
```

***

### tokenCacheCapacity? {#tokencachecapacity}

> `optional` **tokenCacheCapacity?**: `number`

The maximum number of verified tokens to hold in the in-memory cache.

#### Default

```ts
undefined (LfuCache default)
```

***

### tokenCacheMutexTimeoutMs? {#tokencachemutextimeoutms}

> `optional` **tokenCacheMutexTimeoutMs?**: `number`

Maximum time in milliseconds to wait for the token cache mutex during a cache population.

#### Default

```ts
undefined (LfuCache default)
```
