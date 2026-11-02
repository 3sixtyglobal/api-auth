# Interface: ILoginResult

The result of a login.

## Properties

### accountId {#accountid}

> **accountId**: `string`

The account that signed in, the token subject.

***

### token? {#token}

> `optional` **token?**: `string`

The authentication token, if it uses a mechanism with public access.

***

### expiry {#expiry}

> **expiry**: `number`

The expiry time of the token.

***

### profile? {#profile}

> `optional` **profile?**: `IJsonLdNodeObject`

The profile the authentication provider holds, a schema.org Person unless the provider sets another type.

***

### profileReadOnly {#profilereadonly}

> **profileReadOnly**: `boolean`

True when the authentication provider owns the profile, so it can only be edited with that provider.

***

### profileEditUrl? {#profileediturl}

> `optional` **profileEditUrl?**: `string`

The address where the profile can be edited, when the authentication provider owns it.

***

### passwordChangeUrl? {#passwordchangeurl}

> `optional` **passwordChangeUrl?**: `string`

The address where the password is changed, when the authentication provider manages it.

***

### roles {#roles}

> **roles**: `string`[]

The roles the account holds.
