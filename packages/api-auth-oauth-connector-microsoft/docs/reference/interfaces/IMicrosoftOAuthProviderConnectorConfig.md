# Interface: IMicrosoftOAuthProviderConnectorConfig

Configuration for the Microsoft OAuth provider connector.

## Extends

- `IOAuthProviderConnectorConfig`

## Properties

### tenant {#tenant}

> **tenant**: `string`

The tenant that accounts sign in from, a tenant id or one of common, organizations or consumers.

***

### allowedTenants? {#allowedtenants}

> `optional` **allowedTenants?**: `string`[]

The tenant ids accounts may sign in from, any tenant the tenant setting accepts when omitted.
The e-mail address of an account from one of these tenants is trusted without the xms_edov claim.

***

### personalProfileEditUrl? {#personalprofileediturl}

> `optional` **personalProfileEditUrl?**: `string`

The address where personal accounts edit their profile, profileEditUrl is used for work accounts.

***

### personalPasswordChangeUrl? {#personalpasswordchangeurl}

> `optional` **personalPasswordChangeUrl?**: `string`

The address where personal accounts change their password, passwordChangeUrl is used for work
accounts.

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
