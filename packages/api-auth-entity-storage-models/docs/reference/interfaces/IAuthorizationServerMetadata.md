# Interface: IAuthorizationServerMetadata

The OAuth 2.0 authorization server metadata of the node, with the field names RFC 8414 gives them.

## See

https://datatracker.ietf.org/doc/html/rfc8414#section-2

## Properties

### issuer {#issuer}

> **issuer**: `string`

The issuer, the public origin of the node.

***

### authorization\_endpoint {#authorization_endpoint}

> **authorization\_endpoint**: `string`

The address of the login page that takes the authorization request.

***

### token\_endpoint {#token_endpoint}

> **token\_endpoint**: `string`

The address the authorization code is exchanged at.

***

### response\_types\_supported {#response_types_supported}

> **response\_types\_supported**: `string`[]

The response types supported, only code.

***

### grant\_types\_supported {#grant_types_supported}

> **grant\_types\_supported**: `string`[]

The grant types supported, only authorization_code.

***

### code\_challenge\_methods\_supported {#code_challenge_methods_supported}

> **code\_challenge\_methods\_supported**: `string`[]

The PKCE code challenge methods supported, only S256.

***

### token\_endpoint\_auth\_methods\_supported {#token_endpoint_auth_methods_supported}

> **token\_endpoint\_auth\_methods\_supported**: `string`[]

How clients authenticate at the token endpoint, only none as clients are public and use PKCE.
