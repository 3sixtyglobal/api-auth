# Interface: IEntityStorageOrganizationRequestAdminServiceConstructorOptions

Options for the EntityStorageOrganizationRequestAdminService constructor.

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

The identity component used to issue the membership credential.

#### Default

```ts
identity-service
```

***

### authorizationComponentType? {#authorizationcomponenttype}

> `optional` **authorizationComponentType?**: `string`

The authorization component used to find callers with escalated privilege.

#### Default

```ts
authorization
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

### config? {#config}

> `optional` **config?**: [`IEntityStorageOrganizationRequestAdminServiceConfig`](IEntityStorageOrganizationRequestAdminServiceConfig.md)

The configuration for the service.
