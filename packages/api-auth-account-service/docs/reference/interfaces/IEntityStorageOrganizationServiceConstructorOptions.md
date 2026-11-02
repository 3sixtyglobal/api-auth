# Interface: IEntityStorageOrganizationServiceConstructorOptions

Options for the EntityStorageOrganizationService constructor.

## Properties

### organizationEntityStorageType? {#organizationentitystoragetype}

> `optional` **organizationEntityStorageType?**: `string`

The entity storage for the organizations.

#### Default

```ts
organization
```

***

### accountDataEntityStorageType? {#accountdataentitystoragetype}

> `optional` **accountDataEntityStorageType?**: `string`

The entity storage for the account data, which holds the organization profiles and memberships.

#### Default

```ts
account-data
```

***

### organizationRequestEntityStorageType? {#organizationrequestentitystoragetype}

> `optional` **organizationRequestEntityStorageType?**: `string`

The entity storage for the requests to join an organization, whose pending requests are
rejected when the organization is removed.

#### Default

```ts
organization-request
```

***

### identityComponentType? {#identitycomponenttype}

> `optional` **identityComponentType?**: `string`

The identity component used to create organization DIDs and membership credentials.

#### Default

```ts
identity-service
```

***

### authorizationComponentType? {#authorizationcomponenttype}

> `optional` **authorizationComponentType?**: `string`

The authorization component used to find callers with escalated privilege and give roles.

#### Default

```ts
authorization
```

***

### authenticationRateServiceType? {#authenticationrateservicetype}

> `optional` **authenticationRateServiceType?**: `string`

The rate component used to limit exporting and importing organization identities.

#### Default

```ts
authentication-rate
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

> `optional` **config?**: [`IEntityStorageOrganizationServiceConfig`](IEntityStorageOrganizationServiceConfig.md)

The configuration for the service.
