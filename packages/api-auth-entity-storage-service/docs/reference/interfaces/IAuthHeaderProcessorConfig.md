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

### logoutCookieNames? {#logoutcookienames}

> `optional` **logoutCookieNames?**: `string`[]

Other cookies to remove on logout, such as the cookie that keeps an OAuth sign in.

#### Default

```ts
["oauth_transaction"]
```

***

### cookieSameSite? {#cookiesamesite}

> `optional` **cookieSameSite?**: `"Strict"` \| `"Lax"` \| `"None"`

The SameSite attribute of the token cookie, the cookie is always Secure. Lax or Strict limit the
cookie to requests from the same site, None also allows a site on another domain. With None,
any site can make a browser send the cookie with a request that changes state, such as
POST /authentication/logout and POST /authentication/refresh, which take no body, so enable the origin
check processor, TWIN_ORIGIN_CHECK_ENABLED on a node, which refuses cookie authenticated changes
from other origins.

#### Default

```ts
None
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
signature check, the tenant lookup and the user lookup. A password change, reset, disable or
removal clears the tokens of the account straight away, but only in the process that made it,
other nodes and processes notice it up to this long later, as they do a signing key rotation.
An entry never outlives the expiry claim of its own token either.

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
