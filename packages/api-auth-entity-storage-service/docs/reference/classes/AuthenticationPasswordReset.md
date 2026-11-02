# Class: AuthenticationPasswordReset

Class defining the storage for a single use token to reset a forgotten password or verify a sign up.

## Constructors

### Constructor

> **new AuthenticationPasswordReset**(): `AuthenticationPasswordReset`

#### Returns

`AuthenticationPasswordReset`

## Properties

### id {#id}

> **id**: `string`

The hash of the token, the token itself is never stored.

***

### accountId {#accountid}

> **accountId**: `string`

The account the token resets the password of.

***

### expires {#expires}

> **expires**: `string`

When the token expires, in ISO date format.

***

### dateCreated {#datecreated}

> **dateCreated**: `string`

When the token was created, in ISO date format.

***

### purpose? {#purpose}

> `optional` **purpose?**: `string`

What the token is for, absent for a password reset.

***

### password? {#password}

> `optional` **password?**: `string`

The password hash given with a sign up, set on the account when the token is verified.

***

### salt? {#salt}

> `optional` **salt?**: `string`

The salt of the password hash.

***

### passwordAlgorithm? {#passwordalgorithm}

> `optional` **passwordAlgorithm?**: `string`

The algorithm of the password hash.

***

### passwordHashParameters? {#passwordhashparameters}

> `optional` **passwordHashParameters?**: `string`

The parameters of the password hash.

***

### used? {#used}

> `optional` **used?**: `boolean`

True once the token has been used, before it is removed.
