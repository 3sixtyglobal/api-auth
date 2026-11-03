# Auth Entity Storage Service Examples

These snippets show how to wire authentication services into your component container and apply token processing in request pipelines.

## EntityStorageAuthenticationAdminService

```typescript
import { EntityStorageAuthenticationAdminService } from '@3sixty/api-auth-entity-storage-service';

const adminService = new EntityStorageAuthenticationAdminService();

console.log(adminService.className()); // EntityStorageAuthenticationAdminService

// E-mail addresses are stored in lower case, and accounts an admin creates are verified.
await adminService.create({
  email: 'Owner@Example.org',
  password: 'StartPassword123',
  disabled: false
});

// An admin sets a password without the current one, which ends the sessions of the account and
// removes its password reset links.
await adminService.updatePassword('owner@example.org', 'StartPassword124');

const created = await adminService.get('owner@example.org');
console.log(created.accountId); // 6f1c2c0e-4b7a-4f0e-9c1a-2d3e4f5a6b7c
```

```typescript
import { EntityStorageAuthenticationAdminService } from '@3sixty/api-auth-entity-storage-service';

const adminService = new EntityStorageAuthenticationAdminService();

// Accounts of any provider are found by e-mail address, or by account id when more than one
// provider holds an account for the address.
const user = await adminService.get('owner@example.org');
console.log(user.authProviderId); // entity-storage
await adminService.remove(user.accountId);
```

Creating a user through the REST route answers 201 Created with a `Location` header, or 409 Conflict when a password account already uses the e-mail address. A current password given with an admin password change that does not match is refused with 403 Forbidden.

Callers manage every account of their tenant. Only callers holding the escalated privilege role (`global-admin` by default) may change, disable or remove accounts that hold it, and nobody can disable their own account. Calls with no caller account, such as from the node CLI, are system calls and are not limited. Admin actions are audited with the caller as the actor and the account acted on in the data.

```typescript
import { EntityStorageAuthenticationAdminService } from '@3sixty/api-auth-entity-storage-service';

const adminService = new EntityStorageAuthenticationAdminService();

// Find accounts by the start of their e-mail address, or exactly, and by provider.
const page = await adminService.query('alice@', false, 'entity-storage', undefined, 20);
console.log(page.entities[0].dateCreated); // 2026-01-12T09:05:23.123Z
console.log(page.entities[0].verified); // true

// A disabled account cannot sign in with any provider, refresh a token or reset its password, its
// tokens stop working and its password reset links are removed.
await adminService.disable('alice@example.org');
console.log((await adminService.get('alice@example.org')).disabled); // true
await adminService.enable('alice@example.org');
```

The identity and organization of an account are held in its account data, so these need the account data admin component (`authentication-account-admin`). Getting a single user returns them as `userIdentity` and `organizationIdentity`. An update replaces the identity and makes the organization the default one of the account, through the account data admin component and its rules: a caller without escalated privilege cannot change the identity or organization of their own account, and must bind an identity through the account service with a proof of the DID.

```typescript
import { EntityStorageAuthenticationAdminService } from '@3sixty/api-auth-entity-storage-service';

const adminService = new EntityStorageAuthenticationAdminService();

await adminService.update({
  email: 'alice@example.org',
  userIdentity: 'did:example:alice',
  organizationIdentity: 'did:example:org'
});

const byIdentity = await adminService.getByIdentity('did:example:alice');
console.log(byIdentity.email); // alice@example.org
console.log(byIdentity.organizationIdentity); // did:example:org
```

## EntityStorageAuthenticationService

```typescript
import { EntityStorageAuthenticationService } from '@3sixty/api-auth-entity-storage-service';

const authService = new EntityStorageAuthenticationService();

await authService.start('default');
console.log(authService.className()); // EntityStorageAuthenticationService

const policy = await authService.passwordPolicy();

// The providers to offer on the login page, and how each changes passwords and profiles.
const providers = await authService.providers();
console.log(providers.map(p => `${p.authProviderId}:${p.signInMethod}`)); // ['entity-storage:password']
console.log(policy.minPasswordLength); // 8

// Password logins use the provider registered as entity-storage. An unknown or disabled account fails
// the same way as a wrong password, as does a rate limited login. The correct password for an account
// whose e-mail address is not verified yet fails with accountNotVerified instead, so the owner can be
// told to follow the verification link, a wrong password for it still fails with loginFailed. Logins are limited
// per e-mail address, with loginRateLimitPerClient they are limited per client address, per e-mail
// address together with the client address, and per e-mail address from every client with a higher
// limit, so an attacker cannot lock an account out for everyone.
const loginResult = await authService.login('alice@example.org', 'correct-horse-battery-staple');

// Any other registered provider creates the account on the first login, gives it the default roles
// and stores its profile read only. A provider is enabled by registering it with the factory.
// Provider logins are rate limited per client address, or per provider account without a trusted
// client address, and concurrent first logins on one node create a single account.
// The photo the provider holds is stored as the avatar account data item, marked read only, and only
// written when it changed. When the provider holds no photo the avatar it stored is removed, an
// avatar the account uploaded is kept, and when the photo could not be fetched or stored the stored
// avatar is kept and the failure logged, the login still succeeds.
const providerResult = await authService.loginWithProvider('google', {
  code: 'authorization-code',
  codeVerifier: 'code-verifier',
  redirectUri: 'https://node.example.org/authentication/oauth/google/callback',
  nonce: 'nonce'
});
console.log(providerResult.profile?.['@type']); // Person
console.log(providerResult.profileReadOnly); // true, edit it at providerResult.profileEditUrl
console.log(providerResult.passwordChangeUrl); // where the provider changes the password
console.log(loginResult.roles); // the roles in authorizationModelId

// Changing your own password always needs the current password, an admin or a reset link does not.
// It ends the other sessions of the account and returns a new token for this one, keeping its start.
const passwordResult = await authService.updatePassword(
  'correct-horse-battery-staple',
  'correct-horse-battery-staple-2',
  loginResult.token
);

// A refresh keeps the start of the session, which ends after maxSessionMinutes when it is set.
// A token from an earlier version without a session start keeps none, so it never counts as a
// recent sign in, and cannot be refreshed when maxSessionMinutes is set. Refreshes are rate limited
// per session.
const refreshResult = await authService.refresh(passwordResult.token);

await authService.logout(refreshResult.token);
console.log(refreshResult.expiry > 0); // true

// The signed in account, with its identity and organization. The profile and password addresses come
// from the provider configuration, for the provider tenant stored at the last sign in.
const me = await authService.me();
console.log(me.authProviderId); // google
console.log(me.roles); // ['user'], so an app can show what the account may do

await authService.stop('default');
```

`PUT /authentication/password` answers 200 OK with `{ token, expiry }`, and 403 Forbidden when the current password does not match. The new token carries the new password version, so the other sessions of the account end while this one continues until the end of its maximum length. A request signed in by cookie gets the new token as the cookie and no `token` in the body, a bearer request takes it from the body. A password set by an admin or with a reset link ends every session of the account.

Password sign up is enabled when the `entity-storage` provider is registered with the authentication provider factory, otherwise `register` and `verifyRegistration` are refused with a 403, `selfRegistrationDisabled`. A sign up must verify its e-mail address: `register` resolves when the sign up is accepted, and the route answers 202 Accepted without a body, whether or not the address already has an account. A new account is stored unverified without roles and sent a verification link, while the owner of an address that already has an account is told of the sign up instead. Verifying the link gives the account the default roles, until then it cannot sign in. Resetting the password with a link sent to the address also verifies the account and gives it the default roles. An unverified sign up older than the link expiry is replaced by a new sign up for the address. A repeated sign up for an address that is still waiting for verification sends a new link and stops the earlier links working, and verifying a link sets the password given with that sign up, so whoever signed up first for an address cannot keep their password. The verification tokens are stored hashed, used once and kept in the password reset storage with the password hash of their sign up, which is never returned. The default roles may not include the escalated privilege role.

The limits per client address, for provider logins, sign ups, verifying a sign up, asking for and using a password reset link, and logins with `loginRateLimitPerClient`, are only applied when `clientAddressRateLimitEnabled` is set. Only set it when the client address can be trusted, such as behind configured trusted proxies, as otherwise every client may share the address of a proxy or send a false one. When it is off, those limits are applied per provider account, per e-mail address or per token instead, or skipped for logins per client, and the limits per e-mail address still apply. A limit per e-mail address lets anyone use up the attempts of an address, a limit per token or provider account does not stop one client trying many, so set `clientAddressRateLimitEnabled` wherever the client address can be trusted.

Sign ups and first provider logins are serialised per address or provider account within one node only. Nodes sharing the user storage may each create an account when the same address signs up, or the same provider account first signs in, on both at the same moment, so route those requests to one node where that matters.

Changes to an account, such as a sign in, a password change, a disable or a verification, are written over the account as it was read, so the last write wins and a change made meanwhile by another request can be lost. Password reset and verification links are removed when they are used.

Removing an account, by an admin, by the account itself or when an unverified sign up expires, disables it first so its sessions end, then removes its links, requests to join an organization, account data and roles in `authorizationModelId` through the authorization component when it exists, and the account last.

```typescript
import { EntityStorageAuthenticationService } from '@3sixty/api-auth-entity-storage-service';

const authService = new EntityStorageAuthenticationService({
  messagingComponentType: 'messaging',
  config: {
    defaultRoles: ['user'],
    registrationVerificationUrl: 'https://app.example.org/verify',
    passwordResetUrl: 'https://app.example.org/reset-password',
    emailSender: 'no-reply@example.org',
    emailLocale: 'en',
    emailCompanyName: 'Example Ltd',
    registrationVerificationEmailTemplateId: 'registration-verify',
    registrationExistsEmailTemplateId: 'registration-exists',
    registrationVerificationExpiryMinutes: 1440
  }
});

// Sends https://app.example.org/verify?token=... to the address.
await authService.register({
  email: 'carol@example.org',
  password: 'Correct-Horse-Battery-42',
  givenName: 'Carol'
});

// Until the link is followed, signing in with the password fails with a 401 UnauthorizedError
// whose message is entityStorageAuthenticationService.accountNotVerified.

// The token from the link verifies the account, which can then sign in.
await authService.verifyRegistration('token-from-the-link');
```

Forgotten passwords can be reset with a link sent by e-mail. The link holds a single use token, stored only as a hash, and expires after `passwordResetExpiryMinutes`. Asking for a link completes the same way whether or not the account exists. The reset address, the verification address, the `emailSender` and the messaging component are required, and the service fails to construct without them. The e-mails are sent in the language the request prefers most, the `language` context id the server takes from its `Accept-Language` header, or in `emailLocale`, `en` by default, when it gives none. The messaging component falls back to the template for the language without its region, such as `de` for `de-CH`, then to its default locale. Every e-mail template is also given `companyName` from `emailCompanyName`, empty when not set. Disabled accounts are sent no link and cannot complete a reset, an unverified account is verified by completing one, and a password change by the account, an admin or a reset removes the links of the account.

The service needs a task scheduler component (`task-scheduler`) and a platform component (`platform`), and fails to construct without them. The account lookup and the e-mails of a password reset or a sign up are queued and run after the response, every `deliveryIntervalSeconds`, 60 by default, once the service has started, and when it stops, so the response time does not reveal whether an account exists. The password of a sign up is hashed before the work is queued, so the queue never holds it. The scheduler also removes expired reset and verification links, and unverified sign ups older than the verification link expiry with no unexpired link, every `cleanupIntervalMinutes`, 60 by default, in every tenant through the platform component.

New passwords are hashed with Argon2id (19456 KiB, 2 iterations and 1 lane by default, set with `passwordHashOptions`) and the algorithm and parameters are stored with the account. Passwords stored with the earlier Blake2b hash still sign in and are hashed again with Argon2id on the next successful login, without ending the sessions of the account. E-mail addresses are trimmed and stored in lower case, and accounts stored before then are still found by the address as stored.

```typescript
import { EntityStorageAuthenticationService } from '@3sixty/api-auth-entity-storage-service';

const authService = new EntityStorageAuthenticationService({
  messagingComponentType: 'messaging',
  config: {
    passwordResetUrl: 'https://app.example.org/reset-password',
    registrationVerificationUrl: 'https://app.example.org/verify',
    emailSender: 'no-reply@example.org',
    passwordResetEmailTemplateId: 'password-reset',
    passwordResetExpiryMinutes: 30
  }
});

// Sends https://app.example.org/reset-password?token=... to the account.
await authService.forgotPassword('alice@example.org');

// The token from the link sets a new password and ends every session of the account.
await authService.resetPassword('token-from-the-link', 'Correct-Horse-Battery-43');

// The signed in account can remove itself and the data stored for it, when its session started
// within recentSignInSeconds, 300 by default. It is disabled first, so its tokens stop working, then
// its identity is removed through the account component, authenticationAccountComponentType, with
// the keys the node holds for it. When the identity cannot be removed the account is enabled again,
// with its sessions ended, so the owner can sign in and try again. DELETE /authentication/me clears
// the token cookie as a logout does.
await authService.removeAccount(sessionStart);
```

## AuthHeaderProcessor

```typescript
import { AuthHeaderProcessor } from '@3sixty/api-auth-entity-storage-service';

// The session cookie is Secure and SameSite None by default, set cookieSameSite to Lax or Strict
// when the site is on the same domain as the node.
const processor = new AuthHeaderProcessor({ config: { cookieSameSite: 'Lax' } });

// With SameSite None any site can make a browser send the cookie, so a POST without a body to
// /authentication/logout or /authentication/refresh could be sent from another site. Enable the
// origin check processor, TWIN_ORIGIN_CHECK_ENABLED on a node, which refuses cookie authenticated
// requests that change state from other origins.

await processor.start('default');
console.log(processor.className()); // AuthHeaderProcessor

const request = {
  method: 'get',
  url: '/info',
  headers: {
    authorization: 'Bearer token-value'
  }
};

const response = {};
const contextIds = {};
const processorState: { [id: string]: unknown } = {};

await processor.pre(request, response, { skipAuth: false }, contextIds, processorState);

await processor.post(request, response, { skipAuth: false }, contextIds, processorState);

await processor.stop();
```
