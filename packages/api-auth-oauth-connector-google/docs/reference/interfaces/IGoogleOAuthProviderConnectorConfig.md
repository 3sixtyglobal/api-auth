# Interface: IGoogleOAuthProviderConnectorConfig

Configuration for the Google OAuth provider connector.

## Extends

- `IOAuthProviderConnectorConfig`

## Properties

### allowedDomains? {#alloweddomains}

> `optional` **allowedDomains?**: `string`[]

The Google Workspace domains accounts may sign in from, any account when omitted. The hosted
domain (hd) claim must match, so accounts without it, such as gmail.com accounts, are refused.

***

### clientId {#clientid}

> **clientId**: `string`

The client id registered with the provider.

#### Inherited from

`IOAuthProviderConnectorConfig.clientId`

***

### clientSecret {#clientsecret}

> **clientSecret**: `string`

The client secret registered with the provider.

#### Inherited from

`IOAuthProviderConnectorConfig.clientSecret`

***

### scopes? {#scopes}

> `optional` **scopes?**: `string`[]

The scopes to request.

#### Default

```ts
["openid", "email", "profile"]
```

#### Inherited from

`IOAuthProviderConnectorConfig.scopes`

***

### profileReadOnly? {#profilereadonly}

> `optional` **profileReadOnly?**: `boolean`

Whether the provider owns the profile, so it can only be edited with the provider.

#### Default

```ts
true
```

#### Inherited from

`IOAuthProviderConnectorConfig.profileReadOnly`

***

### profileEditUrl? {#profileediturl}

> `optional` **profileEditUrl?**: `string`

The address where the profile can be edited, defaults to the provider's account page.

#### Inherited from

`IOAuthProviderConnectorConfig.profileEditUrl`

***

### passwordChangeUrl? {#passwordchangeurl}

> `optional` **passwordChangeUrl?**: `string`

The address where the password is changed, defaults to the provider's security page.

#### Inherited from

`IOAuthProviderConnectorConfig.passwordChangeUrl`

***

### avatar? {#avatar}

> `optional` **avatar?**: `IAvatarFetchOptions`

The limits the photo the provider holds is fetched with, the defaults when left out.

#### Inherited from

`IOAuthProviderConnectorConfig.avatar`
