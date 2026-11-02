# Interface: IEntityStorageAuthenticationAdminServiceConstructorOptions

Options for the EntityStorageAuthenticationAdminService constructor.

## Properties

### userEntityStorageType? {#userentitystoragetype}

> `optional` **userEntityStorageType?**: `string`

The entity storage for the users.

#### Default

```ts
authentication-user
```

***

### passwordResetEntityStorageType? {#passwordresetentitystoragetype}

> `optional` **passwordResetEntityStorageType?**: `string`

The entity storage for password reset tokens, used to remove the tokens of a removed user.

#### Default

```ts
authentication-password-reset
```

***

### authenticationAuditServiceType? {#authenticationauditservicetype}

> `optional` **authenticationAuditServiceType?**: `string`

The audit component.

#### Default

```ts
authentication-audit
```

***

### authorizationComponentType? {#authorizationcomponenttype}

> `optional` **authorizationComponentType?**: `string`

The authorization component used to guard accounts with escalated privilege.

#### Default

```ts
authorization
```

***

### authenticationAccountAdminComponentType? {#authenticationaccountadmincomponenttype}

> `optional` **authenticationAccountAdminComponentType?**: `string`

The account data admin component, used to read and remove the data of a user.

#### Default

```ts
authentication-account-admin
```

***

### organizationRequestAdminComponentType? {#organizationrequestadmincomponenttype}

> `optional` **organizationRequestAdminComponentType?**: `string`

The organization request admin component, used to remove the requests of a removed user.

#### Default

```ts
organization-request-admin
```

***

### config? {#config}

> `optional` **config?**: [`IEntityStorageAuthenticationAdminServiceConfig`](IEntityStorageAuthenticationAdminServiceConfig.md)

The configuration for the authentication.
