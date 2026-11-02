# Interface: IEntityStorageAuthenticationAccountAdminServiceConstructorOptions

Options for the EntityStorageAuthenticationAccountAdminService constructor.

## Properties

### accountDataEntityStorageType? {#accountdataentitystoragetype}

> `optional` **accountDataEntityStorageType?**: `string`

The entity storage for the account data.

#### Default

```ts
account-data
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

### authenticationRateServiceType? {#authenticationrateservicetype}

> `optional` **authenticationRateServiceType?**: `string`

The rate component used to limit exporting and importing.

#### Default

```ts
authentication-rate
```

***

### identityComponentType? {#identitycomponenttype}

> `optional` **identityComponentType?**: `string`

The identity component used to verify identity proofs and issue membership credentials.

#### Default

```ts
identity-service
```

***

### organizationEntityStorageType? {#organizationentitystoragetype}

> `optional` **organizationEntityStorageType?**: `string`

The entity storage for the registered organizations, which accounts may only join.

#### Default

```ts
organization
```

***

### organizationRequestEntityStorageType? {#organizationrequestentitystoragetype}

> `optional` **organizationRequestEntityStorageType?**: `string`

The entity storage for the requests to join an organization, whose pending requests are
removed with the identity of an account.

#### Default

```ts
organization-request
```

***

### userEntityStorageType? {#userentitystoragetype}

> `optional` **userEntityStorageType?**: `string`

The entity storage for the users, an account id must belong to a user to manage its identity
and profile.

#### Default

```ts
authentication-user
```

***

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The logging component that records failures the service recovers from, when it exists.

#### Default

```ts
logging
```

***

### config? {#config}

> `optional` **config?**: [`IEntityStorageAuthenticationAccountAdminServiceConfig`](IEntityStorageAuthenticationAccountAdminServiceConfig.md)

The configuration for the service.
