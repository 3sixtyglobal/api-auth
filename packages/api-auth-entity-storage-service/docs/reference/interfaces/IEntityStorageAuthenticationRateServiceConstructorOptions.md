# Interface: IEntityStorageAuthenticationRateServiceConstructorOptions

Options for the EntityStorageAuthenticationRateService constructor.

## Properties

### authenticationRateEntryStorageType? {#authenticationrateentrystoragetype}

> `optional` **authenticationRateEntryStorageType?**: `string`

The entity storage for authentication rate entries.

#### Default

```ts
authentication-rate-entry
```

***

### taskSchedulerComponentType? {#taskschedulercomponenttype}

> `optional` **taskSchedulerComponentType?**: `string`

The task scheduler component type.

#### Default

```ts
task-scheduler
```

***

### platformComponentType? {#platformcomponenttype}

> `optional` **platformComponentType?**: `string`

The platform component type, used to run the periodic cleanup per tenant.

#### Default

```ts
platform
```

***

### config? {#config}

> `optional` **config?**: [`IEntityStorageAuthenticationRateServiceConfig`](IEntityStorageAuthenticationRateServiceConfig.md)

The configuration for the authentication rate service.
