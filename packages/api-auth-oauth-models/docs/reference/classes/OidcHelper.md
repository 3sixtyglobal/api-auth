# Class: OidcHelper

Helper class for OpenID Connect providers.

## Constructors

### Constructor

> **new OidcHelper**(): `OidcHelper`

#### Returns

`OidcHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_SCOPES {#default_scopes}

> `readonly` `static` **DEFAULT\_SCOPES**: `string`[]

The scopes requested when the connector config sets none.

***

### ID\_TOKEN\_ALGORITHM {#id_token_algorithm}

> `readonly` `static` **ID\_TOKEN\_ALGORITHM**: `string` = `"RS256"`

The only signing algorithm accepted for ID tokens.

***

### CLAIM\_EMAIL\_VERIFIED {#claim_email_verified}

> `readonly` `static` **CLAIM\_EMAIL\_VERIFIED**: `string` = `"email_verified"`

The ID token claim that says whether the provider verified the e-mail address.

***

### CLAIM\_GIVEN\_NAME {#claim_given_name}

> `readonly` `static` **CLAIM\_GIVEN\_NAME**: `string` = `"given_name"`

The ID token claim with the given name.

***

### CLAIM\_FAMILY\_NAME {#claim_family_name}

> `readonly` `static` **CLAIM\_FAMILY\_NAME**: `string` = `"family_name"`

The ID token claim with the family name.

***

### CLAIM\_PREFERRED\_USERNAME {#claim_preferred_username}

> `readonly` `static` **CLAIM\_PREFERRED\_USERNAME**: `string` = `"preferred_username"`

The ID token claim with the preferred user name.

***

### TOKEN\_RESPONSE\_ID\_TOKEN {#token_response_id_token}

> `readonly` `static` **TOKEN\_RESPONSE\_ID\_TOKEN**: `string` = `"id_token"`

The token response field with the ID token.

***

### TOKEN\_RESPONSE\_ACCESS\_TOKEN {#token_response_access_token}

> `readonly` `static` **TOKEN\_RESPONSE\_ACCESS\_TOKEN**: `string` = `"access_token"`

The token response field with the access token.

## Methods

### authorizationUrl() {#authorizationurl}

> `static` **authorizationUrl**(`authorizationEndpoint`, `config`, `request`): `string`

Build the authorization address for a provider, using PKCE and always showing the provider's account picker.

#### Parameters

##### authorizationEndpoint

`string`

The provider's authorization endpoint.

##### config

[`IOAuthProviderConnectorConfig`](../interfaces/IOAuthProviderConnectorConfig.md)

The connector configuration.

##### request

[`IOAuthAuthorizationRequest`](../interfaces/IOAuthAuthorizationRequest.md)

The values for the authorization request.

#### Returns

`string`

The authorization address.

***

### exchangeCode() {#exchangecode}

> `static` **exchangeCode**(`tokenEndpoint`, `config`, `exchange`): `Promise`\<`string`\>

Exchange an authorization code for an ID token.

#### Parameters

##### tokenEndpoint

`string`

The provider's token endpoint.

##### config

[`IOAuthProviderConnectorConfig`](../interfaces/IOAuthProviderConnectorConfig.md)

The connector configuration.

##### exchange

[`IOAuthCodeExchange`](../interfaces/IOAuthCodeExchange.md)

The authorization code and PKCE verifier.

#### Returns

`Promise`\<`string`\>

The ID token.

#### Throws

UnauthorizedError when the provider rejects the code or returns no ID token.

***

### exchangeCodeForTokens() {#exchangecodefortokens}

> `static` **exchangeCodeForTokens**(`tokenEndpoint`, `config`, `exchange`): `Promise`\<\{ `idToken`: `string`; `accessToken?`: `string`; \}\>

Exchange an authorization code for an ID token and the access token issued with it.

#### Parameters

##### tokenEndpoint

`string`

The provider's token endpoint.

##### config

[`IOAuthProviderConnectorConfig`](../interfaces/IOAuthProviderConnectorConfig.md)

The connector configuration.

##### exchange

[`IOAuthCodeExchange`](../interfaces/IOAuthCodeExchange.md)

The authorization code and PKCE verifier.

#### Returns

`Promise`\<\{ `idToken`: `string`; `accessToken?`: `string`; \}\>

The ID token, and the access token when the provider returned one.

#### Throws

UnauthorizedError when the provider rejects the code or returns no ID token.

***

### verifyIdToken() {#verifyidtoken}

> `static` **verifyIdToken**(`idToken`, `options`): `Promise`\<`JWTPayload`\>

Verify an ID token against the provider's signing keys and the request it answers.

#### Parameters

##### idToken

`string`

The ID token.

##### options

[`IOidcIdTokenOptions`](../interfaces/IOidcIdTokenOptions.md)

The checks the token must pass.

#### Returns

`Promise`\<`JWTPayload`\>

The token payload.

#### Throws

UnauthorizedError when the token fails any check.

***

### toIdentity() {#toidentity}

> `static` **toIdentity**(`payload`, `emailClaims?`): `IAuthenticationProviderIdentity`

Map a verified ID token payload to the identity it describes, with a schema.org Person profile.

#### Parameters

##### payload

`JWTPayload`

The verified ID token payload.

##### emailClaims?

`string`[] = `...`

The claims to read the e-mail address from, in order.

#### Returns

`IAuthenticationProviderIdentity`

The identity.

#### Throws

UnauthorizedError when the token has no e-mail address.
