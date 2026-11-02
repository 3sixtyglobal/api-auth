# Interface: IAuthenticationUser

Contract definition for authentication user.

## Extended by

- [`IAuthenticationUserSecure`](IAuthenticationUserSecure.md)

## Properties

### email {#email}

> **email**: `string`

The user e-mail address.

***

### accountId {#accountid}

> **accountId**: `string`

Stable identifier of the account. This is the token subject.

***

### authProviderId? {#authproviderid}

> `optional` **authProviderId?**: `string`

The authentication provider the account signs in with.

***

### dateCreated? {#datecreated}

> `optional` **dateCreated?**: `string`

When the account was created, in ISO date format.

***

### dateLastLogin? {#datelastlogin}

> `optional` **dateLastLogin?**: `string`

When the account last logged in, in ISO date format.

***

### dateDisabled? {#datedisabled}

> `optional` **dateDisabled?**: `string`

When the account was disabled, in ISO date format, a disabled account cannot sign in.

***

### disabled? {#disabled}

> `optional` **disabled?**: `boolean`

True when the account is disabled and cannot sign in.

***

### verified? {#verified}

> `optional` **verified?**: `boolean`

False until the e-mail address of a self sign up is verified, absent means verified.

***

### userIdentity? {#useridentity}

> `optional` **userIdentity?**: `string`

The identity DID of the account, given when getting or updating a single user.

***

### organizationIdentity? {#organizationidentity}

> `optional` **organizationIdentity?**: `string`

The organization DID of the account, given when getting or updating a single user.
