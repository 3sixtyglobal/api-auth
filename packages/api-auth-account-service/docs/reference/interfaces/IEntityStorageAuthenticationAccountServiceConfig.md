# Interface: IEntityStorageAuthenticationAccountServiceConfig

Configuration for the EntityStorageAuthenticationAccountService.

## Properties

### adoptIdentityRateLimit? {#adoptidentityratelimit}

> `optional` **adoptIdentityRateLimit?**: `IAuthenticationRateActionConfig`

The rate limit for adopting an identity, per account.

#### Default

```ts
{ maxAttempts: 5, windowMinutes: 15 }
```

***

### exportIdentityRateLimit? {#exportidentityratelimit}

> `optional` **exportIdentityRateLimit?**: `IAuthenticationRateActionConfig`

The rate limit for exporting the identity, per account.

#### Default

```ts
{ maxAttempts: 5, windowMinutes: 15 }
```

***

### importIdentityRateLimit? {#importidentityratelimit}

> `optional` **importIdentityRateLimit?**: `IAuthenticationRateActionConfig`

The rate limit for importing an identity, per account.

#### Default

```ts
{ maxAttempts: 5, windowMinutes: 15 }
```

***

### exportProfileRateLimit? {#exportprofileratelimit}

> `optional` **exportProfileRateLimit?**: `IAuthenticationRateActionConfig`

The rate limit for exporting the account data, per account.

#### Default

```ts
{ maxAttempts: 10, windowMinutes: 15 }
```

***

### importProfileRateLimit? {#importprofileratelimit}

> `optional` **importProfileRateLimit?**: `IAuthenticationRateActionConfig`

The rate limit for importing account data, per account.

#### Default

```ts
{ maxAttempts: 10, windowMinutes: 15 }
```

***

### recentSignInSeconds? {#recentsigninseconds}

> `optional` **recentSignInSeconds?**: `number`

How long ago the session may have started for adopting, exporting, importing or removing the
identity, in seconds.

#### Default

```ts
300
```

***

### maxItems? {#maxitems}

> `optional` **maxItems?**: `number`

The most items an account may store itself, the items the node stores, such as the identity,
organizations and imported credentials, count towards it but are not refused.

#### Default

```ts
1000
```

***

### maxItemsByType? {#maxitemsbytype}

> `optional` **maxItemsByType?**: `object`

The most items of a type an account may store itself, by type, merged with the defaults.

#### Index Signature

\[`type`: `string`\]: `number`

#### Default

```ts
{ vc: 200 }
```

***

### profileImportMaxItems? {#profileimportmaxitems}

> `optional` **profileImportMaxItems?**: `number`

The most items an account data import may hold.

#### Default

```ts
1000
```

***

### profileImportMaxBytes? {#profileimportmaxbytes}

> `optional` **profileImportMaxBytes?**: `number`

The largest size of the items of an account data import as JSON, in bytes.

#### Default

```ts
1048576
```

***

### identityImportMaxCredentials? {#identityimportmaxcredentials}

> `optional` **identityImportMaxCredentials?**: `number`

The most credentials an identity import may hold.

#### Default

```ts
100
```

***

### identityProofMaxAgeSeconds? {#identityproofmaxageseconds}

> `optional` **identityProofMaxAgeSeconds?**: `number`

How long an identity proof may be used for after it was created, in seconds.

#### Default

```ts
300
```

***

### verificationMethodId? {#verificationmethodid}

> `optional` **verificationMethodId?**: `string`

The verification method of the organization that signs the membership credential, issued for
the organizations an account was added to before it had an identity.

#### Default

```ts
trust-assertion
```

***

### authorizationModelId? {#authorizationmodelid}

> `optional` **authorizationModelId?**: `string`

The authorization model ID the org admin roles are held in.

#### Default

```ts
system
```

***

### organizationAdminRolePrefix? {#organizationadminroleprefix}

> `optional` **organizationAdminRolePrefix?**: `string`

The prefix of the org admin role of an organization, followed by its DID.

#### Default

```ts
org-admin:
```
