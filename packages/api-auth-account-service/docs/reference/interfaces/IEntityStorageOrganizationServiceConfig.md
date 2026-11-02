# Interface: IEntityStorageOrganizationServiceConfig

Configuration for the EntityStorageOrganizationService.

## Properties

### verificationMethodId? {#verificationmethodid}

> `optional` **verificationMethodId?**: `string`

The verification method added to a created organization DID, used to sign membership credentials.

#### Default

```ts
trust-assertion
```

***

### memberAdminRole? {#memberadminrole}

> `optional` **memberAdminRole?**: `string`

The role whose holders manage every organization of the tenant, the first member of a created
organization is the caller, who already holds it or escalated privilege.

#### Default

```ts
user-admin
```

***

### escalatedPrivilegeRole? {#escalatedprivilegerole}

> `optional` **escalatedPrivilegeRole?**: `string`

The role that grants escalated privilege, callers holding it manage every organization.

#### Default

```ts
global-admin
```

***

### authorizationModelId? {#authorizationmodelid}

> `optional` **authorizationModelId?**: `string`

The authorization model ID used to look up and give roles.

#### Default

```ts
system
```

***

### identityProofMaxAgeSeconds? {#identityproofmaxageseconds}

> `optional` **identityProofMaxAgeSeconds?**: `number`

How long an organization identity proof may be used for after it was created, in seconds.

#### Default

```ts
300
```

***

### recentSignInSeconds? {#recentsigninseconds}

> `optional` **recentSignInSeconds?**: `number`

How long ago the session of the caller may have started for exporting the identity of an
organization, in seconds.

#### Default

```ts
300
```

***

### exportIdentityRateLimit? {#exportidentityratelimit}

> `optional` **exportIdentityRateLimit?**: `IAuthenticationRateActionConfig`

The rate limit for exporting the identity of an organization, per caller.

#### Default

```ts
{ maxAttempts: 5, windowMinutes: 15 }
```

***

### importIdentityRateLimit? {#importidentityratelimit}

> `optional` **importIdentityRateLimit?**: `IAuthenticationRateActionConfig`

The rate limit for creating an organization from an identity export, per caller.

#### Default

```ts
{ maxAttempts: 5, windowMinutes: 15 }
```

***

### organizationAdminRolePrefix? {#organizationadminroleprefix}

> `optional` **organizationAdminRolePrefix?**: `string`

The prefix of the org admin role of an organization, followed by its DID.

#### Default

```ts
org-admin:
```
