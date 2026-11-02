# Class: AuthenticationUserV1

Account storage after authorization removed the stored scope, and before each account had its own id.

## Constructors

### Constructor

> **new AuthenticationUserV1**(): `AuthenticationUserV1`

#### Returns

`AuthenticationUserV1`

## Properties

### email {#email}

> **email**: `string`

The user e-mail address.

***

### password {#password}

> **password**: `string`

The encrypted password for the user.

***

### salt {#salt}

> **salt**: `string`

The salt for the password.

***

### identity {#identity}

> **identity**: `string`

The user identity.

***

### organization {#organization}

> **organization**: `string`

The users organization.

***

### passwordVersion? {#passwordversion}

> `optional` **passwordVersion?**: `number`

The password version counter, incremented on every password change to invalidate existing tokens.
