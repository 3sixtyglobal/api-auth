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

### config? {#config}

> `optional` **config?**: [`IEntityStorageAuthenticationAdminServiceConfig`](IEntityStorageAuthenticationAdminServiceConfig.md)

The configuration for the authentication.
