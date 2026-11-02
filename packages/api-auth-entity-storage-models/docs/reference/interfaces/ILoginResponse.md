# Interface: ILoginResponse

Response from a login on the server.

## Properties

### headers? {#headers}

> `optional` **headers?**: `object`

Response headers.

#### set-cookie?

> `optional` **set-cookie?**: `string`

The cookie containing the auth token.

***

### body {#body}

> **body**: `object`

The login response details.

#### accountId

> **accountId**: `string`

The account that signed in, the token subject.

#### expiry

> **expiry**: `number`

The expiry time of the token.

#### profile?

> `optional` **profile?**: `IJsonLdNodeObject`

The profile the authentication provider holds, a schema.org Person unless the provider sets another type.

#### profileReadOnly?

> `optional` **profileReadOnly?**: `boolean`

True when the authentication provider owns the profile, so it can only be edited with that provider.

#### profileEditUrl?

> `optional` **profileEditUrl?**: `string`

The address where the profile can be edited, when the authentication provider owns it.

#### passwordChangeUrl?

> `optional` **passwordChangeUrl?**: `string`

The address where the password is changed, when the authentication provider manages it.

#### roles

> **roles**: `string`[]

The roles the account holds.
