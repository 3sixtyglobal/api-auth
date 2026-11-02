# Interface: IAccountIdentityExport

The identity of an account with the credentials it holds, to move it to another account or node.
It contains private keys and must be protected.

## Properties

### type {#type}

> **type**: `"account-identity"`

The type of the file, checked first when it is imported.

***

### version {#version}

> **version**: `number`

The version of the file.

***

### identity {#identity}

> **identity**: `IIdentityExport`

The identity with its private keys.

***

### credentials? {#credentials}

> `optional` **credentials?**: `unknown`[]

The verifiable credentials held by the account, JSON credential objects with an embedded proof.
