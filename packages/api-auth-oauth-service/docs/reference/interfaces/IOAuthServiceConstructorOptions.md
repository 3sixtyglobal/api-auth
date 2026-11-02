# Interface: IOAuthServiceConstructorOptions

Options for the OAuthService constructor.

## Properties

### authenticationComponentType? {#authenticationcomponenttype}

> `optional` **authenticationComponentType?**: `string`

The authentication component that creates accounts and issues tokens.

#### Default

```ts
authentication
```

***

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The logging component.

#### Default

```ts
logging
```

***

### vaultConnectorType? {#vaultconnectortype}

> `optional` **vaultConnectorType?**: `string`

The vault holding the key that signs the sign in kept by the browser.

#### Default

```ts
vault
```

***

### config {#config}

> **config**: [`IOAuthServiceConfig`](IOAuthServiceConfig.md)

The configuration for the service.
