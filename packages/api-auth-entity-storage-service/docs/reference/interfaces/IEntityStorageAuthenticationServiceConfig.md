# Interface: IEntityStorageAuthenticationServiceConfig

Configuration for the entity storage authentication service.

## Properties

### signingKeyName? {#signingkeyname}

> `optional` **signingKeyName?**: `string`

The name of the key to retrieve from the vault for signing JWT.

#### Default

```ts
auth-signing
```

***

### defaultTtlMinutes? {#defaultttlminutes}

> `optional` **defaultTtlMinutes?**: `number`

The default time to live for the JWT.

#### Default

```ts
60
```

***

### minPasswordLength? {#minpasswordlength}

> `optional` **minPasswordLength?**: `number`

The minimum password length for new password validation.

#### Default

```ts
8
```

***

### loginRateLimit? {#loginratelimit}

> `optional` **loginRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for login failure rate limit.

#### Default

```ts
{ maxAttempts: 5, windowMinutes: 15 }
```

***

### passwordChangeRateLimit? {#passwordchangeratelimit}

> `optional` **passwordChangeRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for password change rate limit.

#### Default

```ts
{ maxAttempts: 5, windowMinutes: 15 }
```

***

### tokenRefreshRateLimit? {#tokenrefreshratelimit}

> `optional` **tokenRefreshRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for token refresh rate limit.

#### Default

```ts
{ maxAttempts: 30, windowMinutes: 60 }
```
