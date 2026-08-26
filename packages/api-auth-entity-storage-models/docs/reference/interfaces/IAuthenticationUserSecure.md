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

### userIdentity {#useridentity}

> **userIdentity**: `string`

The user identity.

#### Inherited from

[`IAuthenticationUser`](IAuthenticationUser.md).[`userIdentity`](IAuthenticationUser.md#useridentity)

***

### organizationIdentity {#organizationidentity}

> **organizationIdentity**: `string`

The users organization.

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
