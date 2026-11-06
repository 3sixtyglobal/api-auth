# Interface: IOAuthAccessToken

An access token issued for an OAuth 2.0 authorization code, with the field names RFC 6749 gives them.

## See

https://datatracker.ietf.org/doc/html/rfc6749#section-5.1

## Properties

### access\_token {#access_token}

> **access\_token**: `string`

The access token, a session token of the node.

***

### token\_type {#token_type}

> **token\_type**: `string`

The type of the token, Bearer.

***

### expires\_in {#expires_in}

> **expires\_in**: `number`

How long the token can be used for, in seconds.
