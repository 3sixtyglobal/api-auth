# Interface: IAuthenticationUserSecure

Contract definition for authentication user.

## Extends

- [`IAuthenticationUser`](IAuthenticationUser.md)

## Properties

### email {#email}

> **email**: `string`

The user e-mail address.

#### Inherited from

[`IAuthenticationUser`](IAuthenticationUser.md).[`email`](IAuthenticationUser.md#email)

***

### accountId {#accountid}

> **accountId**: `string`

Stable identifier of the account. This is the token subject.

#### Inherited from

[`IAuthenticationUser`](IAuthenticationUser.md).[`accountId`](IAuthenticationUser.md#accountid)

***

### authProviderId? {#authproviderid}

> `optional` **authProviderId?**: `string`

The authentication provider the account signs in with.

#### Inherited from

[`IAuthenticationUser`](IAuthenticationUser.md).[`authProviderId`](IAuthenticationUser.md#authproviderid)

***

### dateCreated? {#datecreated}

> `optional` **dateCreated?**: `string`

When the account was created, in ISO date format.

#### Inherited from

[`IAuthenticationUser`](IAuthenticationUser.md).[`dateCreated`](IAuthenticationUser.md#datecreated)

***

### dateLastLogin? {#datelastlogin}

> `optional` **dateLastLogin?**: `string`

When the account last logged in, in ISO date format.

#### Inherited from

[`IAuthenticationUser`](IAuthenticationUser.md).[`dateLastLogin`](IAuthenticationUser.md#datelastlogin)

***

### dateDisabled? {#datedisabled}

> `optional` **dateDisabled?**: `string`

When the account was disabled, in ISO date format, a disabled account cannot sign in.

#### Inherited from

[`IAuthenticationUser`](IAuthenticationUser.md).[`dateDisabled`](IAuthenticationUser.md#datedisabled)

***

### disabled? {#disabled}

> `optional` **disabled?**: `boolean`

True when the account is disabled and cannot sign in.

#### Inherited from

[`IAuthenticationUser`](IAuthenticationUser.md).[`disabled`](IAuthenticationUser.md#disabled)

***

### verified? {#verified}

> `optional` **verified?**: `boolean`

False until the e-mail address of a self sign up is verified, absent means verified.

#### Inherited from

[`IAuthenticationUser`](IAuthenticationUser.md).[`verified`](IAuthenticationUser.md#verified)

***

### userIdentity? {#useridentity}

> `optional` **userIdentity?**: `string`

The identity DID of the account, given when getting or updating a single user.

#### Inherited from

[`IAuthenticationUser`](IAuthenticationUser.md).[`userIdentity`](IAuthenticationUser.md#useridentity)

***

### organizationIdentity? {#organizationidentity}

> `optional` **organizationIdentity?**: `string`

The organization DID of the account, given when getting or updating a single user.

#### Inherited from

[`IAuthenticationUser`](IAuthenticationUser.md).[`organizationIdentity`](IAuthenticationUser.md#organizationidentity)

***

### password {#password}

> **password**: `string`

The encrypted password for the user.

***

### salt {#salt}

> **salt**: `string`

The salt for the password.

***

### tenantId {#tenantid}

> **tenantId**: `string`

The tenant ID associated with the user, optional in single tenant contexts.
