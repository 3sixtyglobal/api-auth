# Class: AuthenticationUser

Class defining the storage for user login credentials.

## Constructors

### Constructor

> **new AuthenticationUser**(): `AuthenticationUser`

#### Returns

`AuthenticationUser`

## Properties

### accountId {#accountid}

> **accountId**: `string`

Stable identifier of the account. This is the token subject.

***

### email {#email}

> **email**: `string`

The user e-mail address.

***

### password? {#password}

> `optional` **password?**: `string`

The encrypted password for the user, absent for accounts that sign in through a provider.

***

### salt? {#salt}

> `optional` **salt?**: `string`

The salt for the password.

***

### authProviderId {#authproviderid}

> **authProviderId**: `string`

The identifier of the provider that authenticates the account.

***

### providerAccountId? {#provideraccountid}

> `optional` **providerAccountId?**: `string`

The account identifier issued by the provider, such as the OpenID Connect subject.

***

### providerTenantId? {#providertenantid}

> `optional` **providerTenantId?**: `string`

The tenant the provider signed the account in from, such as the Microsoft tenant id, from its
last sign in.

***

### passwordVersion? {#passwordversion}

> `optional` **passwordVersion?**: `number`

The password version counter, incremented on every password change to invalidate existing tokens.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

When the account was created, in ISO date format.

***

### dateModified {#datemodified}

> **dateModified**: `string`

When the account was last modified, in ISO date format.

***

### dateLastLogin? {#datelastlogin}

> `optional` **dateLastLogin?**: `string`

When the account last logged in, in ISO date format.

***

### dateDisabled? {#datedisabled}

> `optional` **dateDisabled?**: `string`

When the account was disabled, in ISO date format, a disabled account cannot sign in.

***

### verified? {#verified}

> `optional` **verified?**: `boolean`

False until the e-mail address of a self sign up is verified, absent means verified.

***

### passwordAlgorithm? {#passwordalgorithm}

> `optional` **passwordAlgorithm?**: `string`

The algorithm of the password hash, absent for the legacy Blake2b hash.

***

### passwordHashParameters? {#passwordhashparameters}

> `optional` **passwordHashParameters?**: `string`

The parameters of the password hash, such as t=2,m=19456,p=1 for Argon2id.
