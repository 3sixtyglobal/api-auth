# Class: EntityStorageAuthenticationService

Implementation of the authentication component using entity storage.

## Implements

- `IAuthenticationComponent`

## Constructors

### Constructor

> **new EntityStorageAuthenticationService**(`options?`): `EntityStorageAuthenticationService`

Create a new instance of EntityStorageAuthentication.

#### Parameters

##### options?

[`IEntityStorageAuthenticationServiceConstructorOptions`](../interfaces/IEntityStorageAuthenticationServiceConstructorOptions.md)

The dependencies for the identity connector.

#### Returns

`EntityStorageAuthenticationService`

#### Throws

GeneralError when the default roles include the escalated privilege role.

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_ROLES {#default_roles}

> `readonly` `static` **DEFAULT\_ROLES**: `string`[]

The default roles given to accounts created by a provider login or a sign up.

***

### DEFAULT\_AUTHORIZATION\_MODEL\_ID {#default_authorization_model_id}

> `readonly` `static` **DEFAULT\_AUTHORIZATION\_MODEL\_ID**: `string` = `"system"`

The default authorization model ID the roles are given in.

***

### DEFAULT\_PASSWORD\_RESET\_EXPIRY\_MINUTES {#default_password_reset_expiry_minutes}

> `readonly` `static` **DEFAULT\_PASSWORD\_RESET\_EXPIRY\_MINUTES**: `number` = `30`

The default time a password reset link can be used for, in minutes.

***

### DEFAULT\_PASSWORD\_RESET\_EMAIL\_TEMPLATE\_ID {#default_password_reset_email_template_id}

> `readonly` `static` **DEFAULT\_PASSWORD\_RESET\_EMAIL\_TEMPLATE\_ID**: `string` = `"password-reset"`

The default template of the password reset e-mail.

***

### DEFAULT\_EMAIL\_LOCALE {#default_email_locale}

> `readonly` `static` **DEFAULT\_EMAIL\_LOCALE**: `string` = `"en"`

The default locale of the password reset and sign up e-mails.

***

### DEFAULT\_REGISTRATION\_VERIFICATION\_EXPIRY\_MINUTES {#default_registration_verification_expiry_minutes}

> `readonly` `static` **DEFAULT\_REGISTRATION\_VERIFICATION\_EXPIRY\_MINUTES**: `number` = `1440`

The default time a sign up verification link can be used for, in minutes.

***

### DEFAULT\_REGISTRATION\_VERIFICATION\_EMAIL\_TEMPLATE\_ID {#default_registration_verification_email_template_id}

> `readonly` `static` **DEFAULT\_REGISTRATION\_VERIFICATION\_EMAIL\_TEMPLATE\_ID**: `string` = `"registration-verify"`

The default template of the sign up verification e-mail.

***

### DEFAULT\_REGISTRATION\_EXISTS\_EMAIL\_TEMPLATE\_ID {#default_registration_exists_email_template_id}

> `readonly` `static` **DEFAULT\_REGISTRATION\_EXISTS\_EMAIL\_TEMPLATE\_ID**: `string` = `"registration-exists"`

The default template of the e-mail sent when a sign up uses an address that has an account.

***

### DEFAULT\_MIN\_PASSWORD\_LENGTH {#default_min_password_length}

> `readonly` `static` **DEFAULT\_MIN\_PASSWORD\_LENGTH**: `number` = `15`

The minimum password length applied when none is configured, as the password validator applies.

***

### DEFAULT\_MAX\_PASSWORD\_LENGTH {#default_max_password_length}

> `readonly` `static` **DEFAULT\_MAX\_PASSWORD\_LENGTH**: `number` = `128`

The maximum password length applied when none is configured, as the password validator applies.

***

### DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE {#default_escalated_privilege_role}

> `readonly` `static` **DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE**: `string` = `"global-admin"`

The default role that grants escalated privilege.

***

### RATE\_ACTION\_LOGIN {#rate_action_login}

> `readonly` `static` **RATE\_ACTION\_LOGIN**: `string` = `"login"`

The rate limit action for logins per e-mail address and client.

***

### RATE\_ACTION\_LOGIN\_CLIENT {#rate_action_login_client}

> `readonly` `static` **RATE\_ACTION\_LOGIN\_CLIENT**: `string` = `"login-client"`

The rate limit action for logins per client.

***

### RATE\_ACTION\_LOGIN\_ACCOUNT {#rate_action_login_account}

> `readonly` `static` **RATE\_ACTION\_LOGIN\_ACCOUNT**: `string` = `"login-account"`

The rate limit action for logins per e-mail address from every client.

***

### RATE\_ACTION\_LOGIN\_PROVIDER {#rate_action_login_provider}

> `readonly` `static` **RATE\_ACTION\_LOGIN\_PROVIDER**: `string` = `"login-provider"`

The rate limit action for logins through a provider, per client or per provider account.

***

### RATE\_ACTION\_TOKEN\_REFRESH {#rate_action_token_refresh}

> `readonly` `static` **RATE\_ACTION\_TOKEN\_REFRESH**: `string` = `"token-refresh"`

The rate limit action for refreshing the token of a session.

***

### RATE\_ACTION\_REGISTER\_VERIFY {#rate_action_register_verify}

> `readonly` `static` **RATE\_ACTION\_REGISTER\_VERIFY**: `string` = `"register-verify"`

The rate limit action for verifying a sign up.

***

### RATE\_ACTION\_PASSWORD\_FORGOT {#rate_action_password_forgot}

> `readonly` `static` **RATE\_ACTION\_PASSWORD\_FORGOT**: `string` = `"password-forgot"`

The rate limit action for asking for a password reset link.

***

### RATE\_ACTION\_PASSWORD\_RESET {#rate_action_password_reset}

> `readonly` `static` **RATE\_ACTION\_PASSWORD\_RESET**: `string` = `"password-reset"`

The rate limit action for resetting a password with a reset link.

***

### DEFAULT\_CLEANUP\_INTERVAL\_MINUTES {#default_cleanup_interval_minutes}

> `readonly` `static` **DEFAULT\_CLEANUP\_INTERVAL\_MINUTES**: `number` = `60`

The default interval of the removal of expired sign ups and tokens, in minutes.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IAuthenticationComponent.className`

***

### start() {#start}

> **start**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

The service needs to be started when the application is initialized.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when rate-limit actions have been registered and the node identity cached.

#### Implementation of

`IAuthenticationComponent.start`

***

### stop() {#stop}

> **stop**(`nodeLoggingComponentType?`): `Promise`\<`void`\>

The component needs to be stopped when the node is closed.

#### Parameters

##### nodeLoggingComponentType?

`string`

The node logging component type.

#### Returns

`Promise`\<`void`\>

A promise that resolves when all rate-limit actions have been unregistered.

#### Implementation of

`IAuthenticationComponent.stop`

***

### login() {#login}

> **login**(`email`, `password`): `Promise`\<`ILoginResult`\>

Perform a login for the user.

#### Parameters

##### email

`string`

The email address for the user.

##### password

`string`

The password for the user.

#### Returns

`Promise`\<`ILoginResult`\>

The token, and the profile when the provider holds one.

#### Throws

UnauthorizedError the same way when the account is unknown, disabled, the password does
not match or the e-mail address or client tries too often, and with accountNotVerified when the
password matches an enabled account whose e-mail address is not verified yet.

#### Implementation of

`IAuthenticationComponent.login`

***

### loginWithProvider() {#loginwithprovider}

> **loginWithProvider**(`authProviderId`, `credentials`): `Promise`\<`ILoginResult`\>

Perform a login through an authentication provider, creating the account on the first login
when provider sign up is enabled.

#### Parameters

##### authProviderId

`string`

The authentication provider id, as registered with the authentication provider factory.

##### credentials

`unknown`

The provider specific credentials.

#### Returns

`Promise`\<`ILoginResult`\>

The token, and the profile when the provider holds one.

#### Implementation of

`IAuthenticationComponent.loginWithProvider`

***

### register() {#register}

> **register**(`registration`): `Promise`\<`void`\>

Sign up for a password account, when the password provider is registered. The account is
created unverified and a verification link is sent, or the owner of an address that already
has an account is told, after the response, so the response is the same either way.

#### Parameters

##### registration

`IAuthenticationRegistration`

The details of the account.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the sign up has been accepted.

#### Throws

ForbiddenError when the password provider is not registered.

#### Implementation of

`IAuthenticationComponent.register`

***

### verifyRegistration() {#verifyregistration}

> **verifyRegistration**(`token`): `Promise`\<`void`\>

Verify the e-mail address of a self sign up with the token from the verification link, giving
the account the default roles so it can sign in.

#### Parameters

##### token

`string`

The token from the verification link.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has been verified.

#### Throws

ForbiddenError when the password provider is not registered.

#### Throws

UnauthorizedError when the token is unknown, used or expired.

#### Throws

TooManyRequestsError when the client verifies too often.

#### Implementation of

`IAuthenticationComponent.verifyRegistration`

***

### me() {#me}

> **me**(): `Promise`\<`IAuthenticationAccountSummary`\>

Get the signed in account.

#### Returns

`Promise`\<`IAuthenticationAccountSummary`\>

The account details.

#### Throws

NotFoundError when the account no longer exists.

#### Implementation of

`IAuthenticationComponent.me`

***

### logout() {#logout}

> **logout**(`token?`): `Promise`\<`void`\>

Logout the current user.

#### Parameters

##### token?

`string`

The token to logout, if it uses a mechanism with public access.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the logout audit entry has been recorded.

#### Implementation of

`IAuthenticationComponent.logout`

***

### refresh() {#refresh}

> **refresh**(`token?`): `Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

Refresh the token, keeping the start of the session so a session ends once it reaches the
maximum session length. A token without a session start, from an earlier version, starts one.

#### Parameters

##### token?

`string`

The token to refresh, if it uses a mechanism with public access.

#### Returns

`Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

The refreshed token, if it uses a mechanism with public access.

#### Throws

UnauthorizedError the same way when the token is not valid, the account cannot sign in
or the session has reached its maximum length.

#### Implementation of

`IAuthenticationComponent.refresh`

***

### updatePassword() {#updatepassword}

> **updatePassword**(`currentPassword`, `newPassword`, `token?`, `sessionStart?`): `Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

Update the user's password, the current password must be given and match. The other sessions
of the account end and its password reset links stop working, the current session continues
with a new token that keeps the session start of the given token, or starts one without it.

#### Parameters

##### currentPassword

`string`

The current password for the user.

##### newPassword

`string`

The new password for the user.

##### token?

`string`

The token of the current session, if it uses a mechanism with public access.

##### sessionStart?

`number`

When the current session started in seconds, read from the token when omitted.

#### Returns

`Promise`\<\{ `token?`: `string`; `expiry`: `number`; \}\>

The new token for the current session.

#### Throws

ForbiddenError when the current password does not match.

#### Throws

UnauthorizedError when the token is not valid or is for another account.

#### Implementation of

`IAuthenticationComponent.updatePassword`

***

### passwordPolicy() {#passwordpolicy}

> **passwordPolicy**(): `Promise`\<`IPasswordOptions`\>

Get the password policy used for password validation.

#### Returns

`Promise`\<`IPasswordOptions`\>

The password policy options.

#### Implementation of

`IAuthenticationComponent.passwordPolicy`

***

### forgotPassword() {#forgotpassword}

> **forgotPassword**(`email`): `Promise`\<`void`\>

Send a link to reset a forgotten password to the e-mail address, when a password account that
can sign in uses it. The account is looked up and the e-mail sent after the response, on the
next scheduler run, so neither the response nor its timing reveal whether the account exists.

#### Parameters

##### email

`string`

The e-mail address of the account.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been handled.

#### Throws

TooManyRequestsError when the e-mail address or client asks too often.

#### Implementation of

`IAuthenticationComponent.forgotPassword`

***

### resetPassword() {#resetpassword}

> **resetPassword**(`token`, `newPassword`): `Promise`\<`void`\>

Reset a forgotten password with the token from the reset link, ending every session of the account
and verifying an account still waiting for verification.

#### Parameters

##### token

`string`

The token from the reset link.

##### newPassword

`string`

The new password for the account.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the password has been reset.

#### Throws

UnauthorizedError when the token is unknown, used or expired, or the account is disabled.

#### Throws

TooManyRequestsError when the client resets too often.

#### Implementation of

`IAuthenticationComponent.resetPassword`

***

### removeAccount() {#removeaccount}

> **removeAccount**(`sessionStart?`): `Promise`\<`void`\>

Remove the signed in account, its account data, its roles and its requests to join an
organization. The account is disabled first, so its tokens stop working and nothing signs in
meanwhile, then its identity is removed through the account data component, with
the keys the node holds for it, a document published on a ledger is kept. The account is enabled
again when the identity cannot be removed, so the owner can sign in and try again. The route
signs the caller out.

#### Parameters

##### sessionStart?

`number`

When the current session started in seconds, it must be recent.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has been removed.

#### Throws

UnauthorizedError when the session did not start recently.

#### Throws

NotFoundError when the account no longer exists.

#### Implementation of

`IAuthenticationComponent.removeAccount`

***

### providers() {#providers}

> **providers**(): `Promise`\<`IAuthenticationProviderDetails`[]\>

Get the authentication providers enabled on the server.

#### Returns

`Promise`\<`IAuthenticationProviderDetails`[]\>

The providers and what each supports, in the order they were registered.

#### Implementation of

`IAuthenticationComponent.providers`
