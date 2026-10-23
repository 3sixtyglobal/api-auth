# Interface: IEntityStorageAuthenticationAdminServiceConfig

Configuration for the entity storage authentication admin service.

## Properties

### minPasswordLength? {#minpasswordlength}

> `optional` **minPasswordLength?**: `number`

The minimum password length.

#### Default

```ts
15
```

***

### maxPasswordLength? {#maxpasswordlength}

> `optional` **maxPasswordLength?**: `number`

The maximum password length.

#### Default

```ts
128
```

***

### escalatedPrivilegeRole? {#escalatedprivilegerole}

> `optional` **escalatedPrivilegeRole?**: `string`

The role that grants escalated privilege, only callers holding it can modify accounts that hold it.

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
