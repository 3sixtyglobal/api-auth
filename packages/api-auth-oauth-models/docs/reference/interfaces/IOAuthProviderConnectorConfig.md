# Interface: IOAuthProviderConnectorConfig

Configuration for an OAuth provider connector.

## Properties

### clientId {#clientid}

> **clientId**: `string`

The client id registered with the provider.

***

### clientSecret {#clientsecret}

> **clientSecret**: `string`

The client secret registered with the provider.

***

### scopes? {#scopes}

> `optional` **scopes?**: `string`[]

The scopes to request.

#### Default

```ts
["openid", "email", "profile"]
```

***

### profileReadOnly? {#profilereadonly}

> `optional` **profileReadOnly?**: `boolean`

Whether the provider owns the profile, so it can only be edited with the provider.

#### Default

```ts
true
```

***

### profileEditUrl? {#profileediturl}

> `optional` **profileEditUrl?**: `string`

The address where the profile can be edited, defaults to the provider's account page.

***

### passwordChangeUrl? {#passwordchangeurl}

> `optional` **passwordChangeUrl?**: `string`

The address where the password is changed, defaults to the provider's security page.

***

### avatar? {#avatar}

> `optional` **avatar?**: [`IAvatarFetchOptions`](IAvatarFetchOptions.md)

The limits the photo the provider holds is fetched with, the defaults when left out.
