# Interface: IEntityStorageOrganizationRequestAdminServiceConfig

Configuration for the EntityStorageOrganizationRequestAdminService.

## Properties

### verificationMethodId? {#verificationmethodid}

> `optional` **verificationMethodId?**: `string`

The verification method of the organization that signs the membership credential.

#### Default

```ts
trust-assertion
```

***

### escalatedPrivilegeRole? {#escalatedprivilegerole}

> `optional` **escalatedPrivilegeRole?**: `string`

The role that grants escalated privilege, only callers holding it accept the requests of, or
remove the requests of, accounts holding it.

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

### organizationAdminRolePrefix? {#organizationadminroleprefix}

> `optional` **organizationAdminRolePrefix?**: `string`

The prefix of the org admin role of an organization, followed by its DID.

#### Default

```ts
org-admin:
```
