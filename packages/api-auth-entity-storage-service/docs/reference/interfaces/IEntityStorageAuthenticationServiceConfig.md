# Interface: IEntityStorageAuthenticationServiceConfig

Configuration for the entity storage authentication service.

## Properties

### signingKeyName? {#signingkeyname}

> `optional` **signingKeyName?**: `string`

The name of the key to retrieve from the vault for signing JWT.

#### Default

```ts
auth-signing
```

***

### defaultTtlMinutes? {#defaultttlminutes}

> `optional` **defaultTtlMinutes?**: `number`

The default time to live for the JWT.

#### Default

```ts
60
```

***

### minPasswordLength? {#minpasswordlength}

> `optional` **minPasswordLength?**: `number`

The minimum password length for new password validation.

#### Default

```ts
15
```

***

### maxPasswordLength? {#maxpasswordlength}

> `optional` **maxPasswordLength?**: `number`

The maximum password length for new password validation.

#### Default

```ts
128
```

***

### maxSessionMinutes? {#maxsessionminutes}

> `optional` **maxSessionMinutes?**: `number`

The longest a session may last from its sign in, refreshing a token does not extend it.
Unlimited when not set, as before. When set, a token from an earlier version without a session
start cannot be refreshed, so its owner signs in again.

***

### recentSignInSeconds? {#recentsigninseconds}

> `optional` **recentSignInSeconds?**: `number`

How long ago the session may have started for removing the account, in seconds, so a caller
with an older session signs in again first.

#### Default

```ts
300
```

***

### passwordHashOptions? {#passwordhashoptions}

> `optional` **passwordHashOptions?**: `IPasswordHashOptions`

The Argon2id parameters used to hash new passwords.

***

### clientAddressRateLimitEnabled? {#clientaddressratelimitenabled}

> `optional` **clientAddressRateLimitEnabled?**: `boolean`

Rate limit by the client address. Only enable it when the client address can be trusted, such
as behind trusted proxies, as otherwise every client may share a proxy address or spoof it.
When off, the limits per client address are skipped, or applied per e-mail address or token,
and the limits per e-mail address still apply.

#### Default

```ts
false
```

***

### loginRateLimitPerClient? {#loginratelimitperclient}

> `optional` **loginRateLimitPerClient?**: `boolean`

Limit logins per client address and per e-mail address with the client, so an attacker cannot
lock an account out for everyone, with loginClientRateLimit and loginAccountRateLimit also
applied. Otherwise logins are limited per e-mail address only, as before. The client limits
need clientAddressRateLimitEnabled.

#### Default

```ts
false
```

***

### loginRateLimit? {#loginratelimit}

> `optional` **loginRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for the login rate limit, per e-mail address, or per e-mail address and
client address when loginRateLimitPerClient is set.

#### Default

```ts
{ maxAttempts: 5, windowMinutes: 15 }
```

***

### loginClientRateLimit? {#loginclientratelimit}

> `optional` **loginClientRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for the login rate limit per client address, for any e-mail address, used
when loginRateLimitPerClient is set.

#### Default

```ts
{ maxAttempts: 20, windowMinutes: 15 }
```

***

### loginAccountRateLimit? {#loginaccountratelimit}

> `optional` **loginAccountRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for the login rate limit per e-mail address from every client, used when
loginRateLimitPerClient is set, which guards an account against an attack from many addresses.

#### Default

```ts
{ maxAttempts: 50, windowMinutes: 60 }
```

***

### passwordChangeRateLimit? {#passwordchangeratelimit}

> `optional` **passwordChangeRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for password change rate limit.

#### Default

```ts
{ maxAttempts: 5, windowMinutes: 15 }
```

***

### tokenRefreshRateLimit? {#tokenrefreshratelimit}

> `optional` **tokenRefreshRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for the token refresh rate limit, per session, or per account for a token
from an earlier version without a session start. A successful refresh is counted too, so the
limit must allow the refreshes a client makes in the window, a higher limit lets a stolen
token be refreshed more often.

#### Default

```ts
{ maxAttempts: 30, windowMinutes: 60 }
```

***

### loginProviderRateLimit? {#loginproviderratelimit}

> `optional` **loginProviderRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for the rate limit of logins through a provider, per client address when
clientAddressRateLimitEnabled is set, otherwise per account the provider identifies, checked once
the provider has verified it, so a provider that is slow or fails is not limited. A successful
login clears the entry.

#### Default

```ts
{ maxAttempts: 20, windowMinutes: 15 }
```

***

### registerRateLimit? {#registerratelimit}

> `optional` **registerRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for the rate limit of sign ups, per client address when
clientAddressRateLimitEnabled is set, otherwise per e-mail address, which does not stop one
client signing up many addresses.

#### Default

```ts
{ maxAttempts: 5, windowMinutes: 60 }
```

***

### registerVerifyRateLimit? {#registerverifyratelimit}

> `optional` **registerVerifyRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for the rate limit of verifying a sign up, per client address when
clientAddressRateLimitEnabled is set, otherwise per token, which does not stop guessing many
tokens, though tokens are long random values.

#### Default

```ts
{ maxAttempts: 10, windowMinutes: 15 }
```

***

### passwordForgotRateLimit? {#passwordforgotratelimit}

> `optional` **passwordForgotRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for the rate limit of asking for a password reset link, per e-mail address
and per client address. The limit per e-mail address lets anyone use up the requests of an
address, delaying a reset link for its owner.

#### Default

```ts
{ maxAttempts: 5, windowMinutes: 60 }
```

***

### passwordResetRateLimit? {#passwordresetratelimit}

> `optional` **passwordResetRateLimit?**: `IAuthenticationRateActionConfig`

Optional override for the rate limit of resetting a password with a reset link, per client
address when clientAddressRateLimitEnabled is set, otherwise per token.

#### Default

```ts
{ maxAttempts: 10, windowMinutes: 15 }
```

***

### emailSender {#emailsender}

> **emailSender**: `string`

The sender of the password reset and sign up e-mails.

***

### emailCompanyName? {#emailcompanyname}

> `optional` **emailCompanyName?**: `string`

The company name given to every e-mail template as the companyName value, empty when not set.

***

### passwordResetUrl {#passwordreseturl}

> **passwordResetUrl**: `string`

The address of the page that resets the password, the token is added as the token query parameter.

***

### passwordResetExpiryMinutes? {#passwordresetexpiryminutes}

> `optional` **passwordResetExpiryMinutes?**: `number`

How long a password reset link can be used for, in minutes.

#### Default

```ts
30
```

***

### passwordResetEmailTemplateId? {#passwordresetemailtemplateid}

> `optional` **passwordResetEmailTemplateId?**: `string`

The template of the password reset e-mail, given the resetUrl, expires and expiryMinutes values.

#### Default

```ts
password-reset
```

***

### emailLocale? {#emaillocale}

> `optional` **emailLocale?**: `string`

The locale of the password reset and sign up e-mails when the request prefers no language.

#### Default

```ts
en
```

***

### registrationVerificationUrl {#registrationverificationurl}

> **registrationVerificationUrl**: `string`

The address of the page that verifies a sign up, the token is added as the token query parameter.

***

### registrationVerificationExpiryMinutes? {#registrationverificationexpiryminutes}

> `optional` **registrationVerificationExpiryMinutes?**: `number`

How long a sign up verification link can be used for, in minutes. An unverified sign up older
than this can be replaced by a new sign up.

#### Default

```ts
1440
```

***

### registrationVerificationEmailTemplateId? {#registrationverificationemailtemplateid}

> `optional` **registrationVerificationEmailTemplateId?**: `string`

The template of the sign up verification e-mail, given the verifyUrl, expires and expiryMinutes values.

#### Default

```ts
registration-verify
```

***

### registrationExistsEmailTemplateId? {#registrationexistsemailtemplateid}

> `optional` **registrationExistsEmailTemplateId?**: `string`

The template of the e-mail sent when a sign up uses an address that already has an account.

#### Default

```ts
registration-exists
```

***

### defaultRoles? {#defaultroles}

> `optional` **defaultRoles?**: `string`[]

The roles given to accounts created by a provider login or a sign up.

#### Default

```ts
["user"]
```

***

### authorizationModelId? {#authorizationmodelid}

> `optional` **authorizationModelId?**: `string`

The authorization model ID the default roles are given in.

#### Default

```ts
system
```

***

### escalatedPrivilegeRole? {#escalatedprivilegerole}

> `optional` **escalatedPrivilegeRole?**: `string`

The role that grants escalated privilege, the default roles may not include it.

#### Default

```ts
global-admin
```

***

### cleanupIntervalMinutes? {#cleanupintervalminutes}

> `optional` **cleanupIntervalMinutes?**: `number`

How often expired password reset and verification tokens, and unverified sign ups whose links
have all expired, are removed, in minutes.

#### Default

```ts
60
```

***

### deliveryIntervalSeconds? {#deliveryintervalseconds}

> `optional` **deliveryIntervalSeconds?**: `number`

How often the e-mails queued after a response, such as a password reset or sign up, are
delivered, in seconds.

#### Default

```ts
60
```
