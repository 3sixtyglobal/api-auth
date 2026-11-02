# Class: GoogleOAuthProviderConnector

Authentication provider that signs accounts in with Google.

## Implements

- `IOAuthProviderConnector`

## Constructors

### Constructor

> **new GoogleOAuthProviderConnector**(`options`): `GoogleOAuthProviderConnector`

Create a new instance of GoogleOAuthProviderConnector.

#### Parameters

##### options

[`IGoogleOAuthProviderConnectorConstructorOptions`](../interfaces/IGoogleOAuthProviderConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`GoogleOAuthProviderConnector`

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"google"`

The authentication provider id to register the connector with.

***

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### AUTHORIZATION\_ENDPOINT {#authorization_endpoint}

> `readonly` `static` **AUTHORIZATION\_ENDPOINT**: `string` = `"https://accounts.google.com/o/oauth2/v2/auth"`

The Google authorization endpoint.

***

### TOKEN\_ENDPOINT {#token_endpoint}

> `readonly` `static` **TOKEN\_ENDPOINT**: `string` = `"https://oauth2.googleapis.com/token"`

The Google token endpoint.

***

### JWKS\_URI {#jwks_uri}

> `readonly` `static` **JWKS\_URI**: `string` = `"https://www.googleapis.com/oauth2/v3/certs"`

The Google signing keys.

***

### ISSUERS {#issuers}

> `readonly` `static` **ISSUERS**: `string`[]

The issuers Google uses in ID tokens.

***

### PASSWORD\_CHANGE\_URL {#password_change_url}

> `readonly` `static` **PASSWORD\_CHANGE\_URL**: `string` = `"https://myaccount.google.com/signinoptions/password"`

The default address where people change the password for their Google account.

***

### PROFILE\_EDIT\_URL {#profile_edit_url}

> `readonly` `static` **PROFILE\_EDIT\_URL**: `string` = `"https://myaccount.google.com/personal-info"`

The default address where people edit the profile Google holds for them.

***

### CLAIM\_HOSTED\_DOMAIN {#claim_hosted_domain}

> `readonly` `static` **CLAIM\_HOSTED\_DOMAIN**: `string` = `"hd"`

The ID token claim with the hosted domain of a Google Workspace account.

***

### CLAIM\_PICTURE {#claim_picture}

> `readonly` `static` **CLAIM\_PICTURE**: `string` = `"picture"`

The ID token claim with the address of the profile photo.

***

### AVATAR\_SIZE {#avatar_size}

> `readonly` `static` **AVATAR\_SIZE**: `number` = `512`

The width and height of the photo requested from Google, in pixels.

***

### AVATAR\_HOSTS {#avatar_hosts}

> `readonly` `static` **AVATAR\_HOSTS**: `string`[]

The hosts Google serves profile photos from, a photo is only fetched from these or their
subdomains.

## Methods

### avatarUrl() {#avatarurl}

> `static` **avatarUrl**(`picture`): `string` \| `undefined`

Get the address of a Google profile photo at the size requested, Google sizes a photo with an
option such as =s512-c after the path, or a path segment such as s96-c in older addresses.

#### Parameters

##### picture

`string`

The address from the ID token.

#### Returns

`string` \| `undefined`

The address, or undefined when it is not an https address on a Google photo host.

***

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IOAuthProviderConnector.className`

***

### getCapabilities() {#getcapabilities}

> **getCapabilities**(): `IAuthenticationProviderCapabilities`

Get what the provider supports, a redirect with passwords and profiles managed by Google.

#### Returns

`IAuthenticationProviderCapabilities`

The provider capabilities.

#### Implementation of

`IOAuthProviderConnector.getCapabilities`

***

### authorizationUrl() {#authorizationurl}

> **authorizationUrl**(`request`): `string`

Build the address that sends the browser to Google to sign in.

#### Parameters

##### request

`IOAuthAuthorizationRequest`

The values for the authorization request.

#### Returns

`string`

The authorization address.

#### Implementation of

`IOAuthProviderConnector.authorizationUrl`

***

### authenticate() {#authenticate}

> **authenticate**(`credentials`): `Promise`\<`IAuthenticationProviderIdentity`\>

Exchange the authorization code and verify the ID token Google returns.

#### Parameters

##### credentials

`IOAuthCodeExchange`

The authorization code and PKCE verifier.

#### Returns

`Promise`\<`IAuthenticationProviderIdentity`\>

The verified identity.

#### Throws

UnauthorizedError when the exchange or the ID token checks fail, the e-mail address is not
verified, or the domain is not allowed.

#### Implementation of

`IOAuthProviderConnector.authenticate`
