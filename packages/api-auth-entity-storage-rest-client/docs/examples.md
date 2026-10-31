# Auth Entity Storage Rest Client Examples

Use these snippets to integrate sign-in and user administration flows from browser or server-side TypeScript applications.

## EntityStorageAuthenticationAdminRestClient

```typescript
import { EntityStorageAuthenticationAdminRestClient } from '@3sixty/api-auth-entity-storage-rest-client';

const adminClient = new EntityStorageAuthenticationAdminRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1'
});

console.log(adminClient.className()); // EntityStorageAuthenticationAdminRestClient

await adminClient.create({
  email: 'ops@example.org',
  password: 'StrongPassword123'
});

// An admin sets a password without the current one.
await adminClient.updatePassword('ops@example.org', 'StrongPassword124');
const adminUser = await adminClient.get('ops@example.org');
console.log(adminUser.email); // ops@example.org
```

```typescript
import { EntityStorageAuthenticationAdminRestClient } from '@3sixty/api-auth-entity-storage-rest-client';

const adminClient = new EntityStorageAuthenticationAdminRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1'
});

// Accounts of any provider are found by e-mail address, or by account id.
const byEmail = await adminClient.get('ops@example.org');
await adminClient.remove(byEmail.accountId);

console.log(byEmail.authProviderId); // entity-storage
```

```typescript
import { EntityStorageAuthenticationAdminRestClient } from '@3sixty/api-auth-entity-storage-rest-client';

const adminClient = new EntityStorageAuthenticationAdminRestClient({
  endpoint: 'https://api.example.org'
});

// Set the identity and default organization of an account, then find it by its identity.
await adminClient.update({
  email: 'ops@example.org',
  userIdentity: 'did:example:ops',
  organizationIdentity: 'did:example:org'
});
const byIdentity = await adminClient.getByIdentity('did:example:ops');
console.log(byIdentity.email); // ops@example.org
```

```typescript
import { EntityStorageAuthenticationAdminRestClient } from '@3sixty/api-auth-entity-storage-rest-client';

const adminClient = new EntityStorageAuthenticationAdminRestClient({
  endpoint: 'https://api.example.org'
});

// List the accounts whose e-mail address starts with a prefix.
const page = await adminClient.query('ops@', false, undefined, undefined, 20);

// Stop an account signing in, then let it sign in again.
await adminClient.disable(page.entities[0].accountId);
await adminClient.enable(page.entities[0].accountId);
```

## EntityStorageAuthenticationRestClient

```typescript
import { EntityStorageAuthenticationRestClient } from '@3sixty/api-auth-entity-storage-rest-client';

const authClient = new EntityStorageAuthenticationRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1',
  cookieName: 'access_token'
});

console.log(authClient.className()); // EntityStorageAuthenticationRestClient

const policy = await authClient.passwordPolicy();
console.log(policy.minPasswordLength); // 8

const loginResponse = await authClient.login('alice@example.org', 'correct-horse-battery-staple');

// The other sessions end, this one continues with the new token.
const passwordResponse = await authClient.updatePassword(
  'correct-horse-battery-staple',
  'correct-horse-battery-staple-2'
);

const refreshResponse = await authClient.refresh(passwordResponse.token);

// The signed in account, with the identity and organization it holds.
const me = await authClient.me();
console.log(me.accountId); // 01a17afb-e05f-7939-83f2-d4f04c4bdf2e

await authClient.logout(refreshResponse.token);
console.log(refreshResponse.expiry > 0); // true
```

## Sign Up

When the server enables self sign up, a person creates a password account and is signed in.

```typescript
import { EntityStorageAuthenticationRestClient } from '@3sixty/api-auth-entity-storage-rest-client';

const authClient = new EntityStorageAuthenticationRestClient({
  endpoint: 'https://api.example.org'
});

// When the server needs the e-mail address verified the result is undefined and a link is sent.
const result = await authClient.register({
  email: 'carol@example.org',
  password: 'Correct-Horse-Battery-42',
  givenName: 'Carol',
  familyName: 'Smith'
});
console.log(result); // undefined

await authClient.verifyRegistration('token-from-the-link');
```

## Login Options

```typescript
import { EntityStorageAuthenticationRestClient } from '@3sixty/api-auth-entity-storage-rest-client';

const authClient = new EntityStorageAuthenticationRestClient({
  endpoint: 'https://api.example.org'
});

for (const provider of await authClient.providers()) {
  if (provider.signInMethod === 'password') {
    console.log('Show the e-mail and password form');
  } else {
    console.log(`Show a button for /authentication/oauth/${provider.authProviderId}/start`);
  }
  if (provider.passwordChange === 'external') {
    console.log(`Change the password at ${provider.passwordChangeUrl}`);
  }
}
```

## Forgotten Password

```typescript
import { EntityStorageAuthenticationRestClient } from '@3sixty/api-auth-entity-storage-rest-client';

const authClient = new EntityStorageAuthenticationRestClient({
  endpoint: 'https://api.example.org'
});

// Completes the same way whether or not the account exists.
await authClient.forgotPassword('alice@example.org');

// The page the e-mailed link opens reads the token from its address.
const token = new URL(window.location.href).searchParams.get('token') ?? '';
await authClient.resetPassword(token, 'Correct-Horse-Battery-43');
```

## Removing the Signed In Account

```typescript
import { EntityStorageAuthenticationRestClient } from '@3sixty/api-auth-entity-storage-rest-client';

const authClient = new EntityStorageAuthenticationRestClient({
  endpoint: 'https://api.example.org'
});

// Removes the account and its data, and signs out.
await authClient.removeAccount();
```
