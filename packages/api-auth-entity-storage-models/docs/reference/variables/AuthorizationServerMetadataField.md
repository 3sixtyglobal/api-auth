# Variable: AuthorizationServerMetadataField

> `const` **AuthorizationServerMetadataField**: `object`

The names RFC 8414 gives the OAuth 2.0 authorization server metadata.

## Type Declaration

### Issuer {#issuer}

> `readonly` **Issuer**: `"issuer"` = `"issuer"`

The issuer.

### AuthorizationEndpoint {#authorizationendpoint}

> `readonly` **AuthorizationEndpoint**: `"authorization_endpoint"` = `"authorization_endpoint"`

The authorization endpoint.

### TokenEndpoint {#tokenendpoint}

> `readonly` **TokenEndpoint**: `"token_endpoint"` = `"token_endpoint"`

The token endpoint.

### ResponseTypesSupported {#responsetypessupported}

> `readonly` **ResponseTypesSupported**: `"response_types_supported"` = `"response_types_supported"`

The response types supported.

### GrantTypesSupported {#granttypessupported}

> `readonly` **GrantTypesSupported**: `"grant_types_supported"` = `"grant_types_supported"`

The grant types supported.

### CodeChallengeMethodsSupported {#codechallengemethodssupported}

> `readonly` **CodeChallengeMethodsSupported**: `"code_challenge_methods_supported"` = `"code_challenge_methods_supported"`

The PKCE code challenge methods supported.

### TokenEndpointAuthMethodsSupported {#tokenendpointauthmethodssupported}

> `readonly` **TokenEndpointAuthMethodsSupported**: `"token_endpoint_auth_methods_supported"` = `"token_endpoint_auth_methods_supported"`

How clients authenticate at the token endpoint.

## See

https://datatracker.ietf.org/doc/html/rfc8414#section-2
