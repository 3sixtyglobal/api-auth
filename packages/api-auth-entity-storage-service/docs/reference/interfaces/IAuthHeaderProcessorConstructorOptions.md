# Interface: IAuthHeaderProcessorConstructorOptions

Options for the AuthHeaderProcessor constructor.

## Properties

### userEntityStorageType? {#userentitystoragetype}

> `optional` **userEntityStorageType?**: `string`

The entity storage for users.

#### Default

```ts
authentication-user
```

***

### vaultConnectorType? {#vaultconnectortype}

> `optional` **vaultConnectorType?**: `string`

The vault for the private keys.

#### Default

```ts
vault
```

***

### tenantAdminComponentType? {#tenantadmincomponenttype}

> `optional` **tenantAdminComponentType?**: `string`

The component to retrieve tenant information.

#### Default

```ts
tenant-admin
```

***

### config? {#config}

> `optional` **config?**: [`IAuthHeaderProcessorConfig`](IAuthHeaderProcessorConfig.md)

The configuration for the processor.
