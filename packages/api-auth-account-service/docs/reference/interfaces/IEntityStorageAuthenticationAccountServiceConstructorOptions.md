# Interface: IEntityStorageAuthenticationAccountServiceConstructorOptions

Options for the EntityStorageAuthenticationAccountService constructor.

## Properties

### accountDataEntityStorageType? {#accountdataentitystoragetype}

> `optional` **accountDataEntityStorageType?**: `string`

The entity storage for the account data.

#### Default

```ts
account-data
```

***

### organizationRequestEntityStorageType? {#organizationrequestentitystoragetype}

> `optional` **organizationRequestEntityStorageType?**: `string`

The entity storage for the requests to join an organization.

#### Default

```ts
organization-request
```

***

### identityComponentType? {#identitycomponenttype}

> `optional` **identityComponentType?**: `string`

The identity component used to create and verify the identity of an account.

#### Default

```ts
identity-service
```

***

### authorizationComponentType? {#authorizationcomponenttype}

> `optional` **authorizationComponentType?**: `string`

The authorization component that holds the org admin roles.

#### Default

```ts
authorization
```

***

### authenticationRateServiceType? {#authenticationrateservicetype}

> `optional` **authenticationRateServiceType?**: `string`

The rate component used to limit adopting, exporting and importing.

#### Default

```ts
authentication-rate
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

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The logging component that records failures the service recovers from, when it exists.

#### Default

```ts
logging
```

***

### config? {#config}

> `optional` **config?**: [`IEntityStorageAuthenticationAccountServiceConfig`](IEntityStorageAuthenticationAccountServiceConfig.md)

The configuration for the service.
