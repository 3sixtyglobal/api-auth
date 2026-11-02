# Interface: IAuthenticationProviderIdentity

The identity an authentication provider has verified.

## Properties

### providerAccountId {#provideraccountid}

> **providerAccountId**: `string`

The account identifier issued by the provider.

***

### accountId? {#accountid}

> `optional` **accountId?**: `string`

The id of the account in the node's own storage, set by providers that hold their accounts there,
so the account can be read by its id.

***

### providerTenantId? {#providertenantid}

> `optional` **providerTenantId?**: `string`

The tenant the provider signed the account in from, such as the Microsoft tenant id.

***

### email {#email}

> **email**: `string`

The e-mail address the provider holds for the account.

***

### profile? {#profile}

> `optional` **profile?**: `IJsonLdNodeObject`

The profile the provider holds, a schema.org Person unless the provider sets another type.

***

### profileReadOnly? {#profilereadonly}

> `optional` **profileReadOnly?**: `boolean`

True when the provider owns the profile, so it can only be edited with the provider.

***

### avatar? {#avatar}

> `optional` **avatar?**: `WithContext`\<`ImageObjectLeaf`\> \| `null`

The photo the provider holds, a schema.org ImageObject with a data URL. Null when the provider
holds none, so a stored one is removed, and left out when it is not known, such as when it could
not be fetched, so a stored one is kept.

***

### profileEditUrl? {#profileediturl}

> `optional` **profileEditUrl?**: `string`

The address where the profile can be edited, when the provider owns it.

***

### passwordChangeUrl? {#passwordchangeurl}

> `optional` **passwordChangeUrl?**: `string`

The address where the password is changed, when the provider manages it.
