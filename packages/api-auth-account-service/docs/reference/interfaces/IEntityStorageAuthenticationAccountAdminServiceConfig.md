# Interface: IEntityStorageAuthenticationAccountAdminServiceConfig

Configuration for the EntityStorageAuthenticationAccountAdminService.

## Properties

### escalatedPrivilegeRole? {#escalatedprivilegerole}

> `optional` **escalatedPrivilegeRole?**: `string`

The role that grants escalated privilege, only callers holding it can change the identity or
organization of accounts that hold it, or of their own account, or bind an identity without a proof.

#### Default

```ts
global-admin
```

***

### authorizationModelId? {#authorizationmodelid}

> `optional` **authorizationModelId?**: `string`

The authorization model ID used to look up roles.

#### Default

```ts
system
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

The verification method of the organization that signs the membership credential.

#### Default

```ts
trust-assertion
```

***

### recentSignInSeconds? {#recentsigninseconds}

> `optional` **recentSignInSeconds?**: `number`

How long ago the session of the caller may have started for exporting the identity of an
account, in seconds.

#### Default

```ts
300
```

***

### assignableRoles? {#assignableroles}

> `optional` **assignableRoles?**: `string`[]

The roles a caller holding escalated privilege may always grant and revoke, with the escalated
privilege role and every role in use, such as tenant-admin when tenants are enabled.

#### Default

```ts
["user-admin"]
```

***

### organizationAdminRolePrefix? {#organizationadminroleprefix}

> `optional` **organizationAdminRolePrefix?**: `string`

The prefix of the org admin role of an organization, followed by its DID.

#### Default

```ts
org-admin:
```
