# Interface: IOAuthServiceConfig

Configuration for the OAuth service.

## Properties

### successRedirectUrl {#successredirecturl}

> **successRedirectUrl**: `string`

The address to send the browser to after a successful sign in.

***

### failureRedirectUrl {#failureredirecturl}

> **failureRedirectUrl**: `string`

The address to send the browser to when a sign in fails, the reason is added as the error query parameter.

***

### transactionTtlSeconds? {#transactionttlseconds}

> `optional` **transactionTtlSeconds?**: `number`

How long a sign in may take between starting and the callback, in seconds.

#### Default

```ts
600
```

***

### transactionSigningKeyName? {#transactionsigningkeyname}

> `optional` **transactionSigningKeyName?**: `string`

The name of the vault key, held for the node, that signs the sign in kept by the browser. It is
created when it does not exist, and kept apart from the key that signs session tokens. Set it to
the session token key, auth-signing by default, to sign with that key as earlier versions did.

#### Default

```ts
auth-oauth-transaction
```

***

### signingKeyName? {#signingkeyname}

> `optional` **signingKeyName?**: `string`

The name of the vault key, held for the node, that signed the sign in kept by the browser in
earlier versions, still accepted for a sign in started before the update.

#### Default

```ts
auth-signing
```
