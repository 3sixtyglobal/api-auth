# Class: AuthenticationUser

Class defining the storage for user login credentials.

## Constructors

### Constructor

> **new AuthenticationUser**(): `AuthenticationUser`

#### Returns

`AuthenticationUser`

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

### roles {#roles}

> **roles**: `string`

The roles assigned to the user, bar separated.

***

### passwordVersion? {#passwordversion}

> `optional` **passwordVersion?**: `number`

The password version counter, incremented on every password change to invalidate existing tokens.
