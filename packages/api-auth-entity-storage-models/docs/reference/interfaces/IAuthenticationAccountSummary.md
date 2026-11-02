# Interface: IAuthenticationAccountSummary

The signed in account.

## Properties

### accountId {#accountid}

> **accountId**: `string`

The account that is signed in, the token subject.

***

### email {#email}

> **email**: `string`

The e-mail address of the account.

***

### authProviderId {#authproviderid}

> **authProviderId**: `string`

The authentication provider the account signs in with.

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

### identity? {#identity}

> `optional` **identity?**: `string`

The DID of the account, when it has one.

***

### organization? {#organization}

> `optional` **organization?**: `string`

The organization DID of the account, when it has one.

***

### roles {#roles}

> **roles**: `string`[]

The roles the account holds.
