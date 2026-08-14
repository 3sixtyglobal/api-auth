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

### authenticationAuditServiceType? {#authenticationauditservicetype}

> `optional` **authenticationAuditServiceType?**: `string`

The audit service.

#### Default

```ts
authentication-audit
```

***

### config? {#config}

> `optional` **config?**: [`IEntityStorageAuthenticationAdminServiceConfig`](IEntityStorageAuthenticationAdminServiceConfig.md)

The configuration for the authentication.
