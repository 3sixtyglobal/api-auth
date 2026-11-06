# Variable: OAuthParameter

> `const` **OAuthParameter**: `object`

The names RFC 6749 gives the parameters of an OAuth 2.0 token request and response.

## Type Declaration

### GrantType {#granttype}

> `readonly` **GrantType**: `"grant_type"` = `"grant_type"`

The grant type of a token request.

### Code {#code}

> `readonly` **Code**: `"code"` = `"code"`

The authorization code.

### RedirectUri {#redirecturi}

> `readonly` **RedirectUri**: `"redirect_uri"` = `"redirect_uri"`

The redirect address the code was sent to.

### CodeVerifier {#codeverifier}

> `readonly` **CodeVerifier**: `"code_verifier"` = `"code_verifier"`

The PKCE code verifier.

### ClientId {#clientid}

> `readonly` **ClientId**: `"client_id"` = `"client_id"`

The id of the client.

### AccessToken {#accesstoken}

> `readonly` **AccessToken**: `"access_token"` = `"access_token"`

The access token of a token response.

### TokenType {#tokentype}

> `readonly` **TokenType**: `"token_type"` = `"token_type"`

The type of the access token.

### ExpiresIn {#expiresin}

> `readonly` **ExpiresIn**: `"expires_in"` = `"expires_in"`

How long the access token can be used for, in seconds.

### Error {#error}

> `readonly` **Error**: `"error"` = `"error"`

The error code of a refused request.

## See

https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.3
