# Class: MicrosoftOAuthProviderConnector

Authentication provider that signs accounts in with Microsoft.

## Implements

- `IOAuthProviderConnector`

## Constructors

### Constructor

> **new MicrosoftOAuthProviderConnector**(`options`): `MicrosoftOAuthProviderConnector`

Create a new instance of MicrosoftOAuthProviderConnector.

#### Parameters

##### options

[`IMicrosoftOAuthProviderConnectorConstructorOptions`](../interfaces/IMicrosoftOAuthProviderConnectorConstructorOptions.md)

The options for the connector.

#### Returns

`MicrosoftOAuthProviderConnector`

## Properties

### NAMESPACE {#namespace}

> `readonly` `static` **NAMESPACE**: `string` = `"microsoft"`

The authentication provider id to register the connector with.

***

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### AUTHORITY {#authority}

> `readonly` `static` **AUTHORITY**: `string` = `"https://login.microsoftonline.com"`

The Microsoft identity platform address.

***

### PASSWORD\_CHANGE\_URL {#password_change_url}

> `readonly` `static` **PASSWORD\_CHANGE\_URL**: `string` = `"https://mysignins.microsoft.com/security-info/password/change"`

The default address where people change the password for their Microsoft work account.

***

### PROFILE\_EDIT\_URL {#profile_edit_url}

> `readonly` `static` **PROFILE\_EDIT\_URL**: `string` = `"https://myaccount.microsoft.com/"`

The default address where people edit the profile Microsoft holds for their work account.

***

### PERSONAL\_PROFILE\_EDIT\_URL {#personal_profile_edit_url}

> `readonly` `static` **PERSONAL\_PROFILE\_EDIT\_URL**: `string` = `"https://account.microsoft.com/profile"`

The default address where people edit the profile of their personal Microsoft account.

***

### PERSONAL\_PASSWORD\_CHANGE\_URL {#personal_password_change_url}

> `readonly` `static` **PERSONAL\_PASSWORD\_CHANGE\_URL**: `string` = `"https://account.live.com/password/Change"`

The default address where people change the password of their personal Microsoft account.

***

### CLAIM\_EMAIL\_DOMAIN\_OWNER\_VERIFIED {#claim_email_domain_owner_verified}

> `readonly` `static` **CLAIM\_EMAIL\_DOMAIN\_OWNER\_VERIFIED**: `string` = `"xms_edov"`

The optional ID token claim that is true when the domain of the e-mail address is verified by
the tenant, it must be added to the token configuration of the application.

***

### CLAIM\_TENANT\_ID {#claim_tenant_id}

> `readonly` `static` **CLAIM\_TENANT\_ID**: `string` = `"tid"`

The ID token claim with the tenant id.

***

### CONSUMER\_TENANT\_ID {#consumer_tenant_id}

> `readonly` `static` **CONSUMER\_TENANT\_ID**: `string` = `"9188040d-6c67-4c5b-b112-36a304b66dad"`

The tenant id of personal Microsoft accounts, such as Outlook.com and Hotmail.

***

### GRAPH\_USER\_READ\_SCOPE {#graph_user_read_scope}

> `readonly` `static` **GRAPH\_USER\_READ\_SCOPE**: `string` = `"User.Read"`

The Microsoft Graph scope needed to read the profile photo, added to the requested scopes.

***

### AVATAR\_SIZE {#avatar_size}

> `readonly` `static` **AVATAR\_SIZE**: `number` = `504`

The width and height of the photo requested from Microsoft Graph, in pixels.

***

### AVATAR\_URL {#avatar_url}

> `readonly` `static` **AVATAR\_URL**: `string` = `"https://graph.microsoft.com/v1.0/me/photos/504x504/$value"`

The Microsoft Graph address of the profile photo of the signed in account.

## Methods

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

> **getCapabilities**(`providerTenantId?`): `IAuthenticationProviderCapabilities`

Get what the provider supports, a redirect with passwords and profiles managed by Microsoft.

#### Parameters

##### providerTenantId?

`string`

The tenant of an account, personal accounts have their own addresses.

#### Returns

`IAuthenticationProviderCapabilities`

The provider capabilities.

#### Implementation of

`IOAuthProviderConnector.getCapabilities`

***

### authorizationUrl() {#authorizationurl}

> **authorizationUrl**(`request`): `string`

Build the address that sends the browser to Microsoft to sign in.

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

Exchange the authorization code and verify the ID token Microsoft returns.

#### Parameters

##### credentials

`IOAuthCodeExchange`

The authorization code and PKCE verifier.

#### Returns

`Promise`\<`IAuthenticationProviderIdentity`\>

The verified identity.

#### Throws

UnauthorizedError when the exchange or the ID token checks fail, the tenant is not
allowed, or the e-mail address is not verified.

#### Implementation of

`IOAuthProviderConnector.authenticate`
