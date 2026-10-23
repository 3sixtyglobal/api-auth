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
  password: 'StrongPassword123',
  userIdentity: 'did:example:ops',
  organizationIdentity: 'did:example:core'
});

await adminClient.update({
  email: 'ops@example.org',
  userIdentity: 'did:example:ops:team'
});

await adminClient.updatePassword('ops@example.org', 'StrongPassword124', 'StrongPassword123');
const adminUser = await adminClient.get('ops@example.org');
console.log(adminUser.email); // ops@example.org
```

```typescript
import { EntityStorageAuthenticationAdminRestClient } from '@3sixty/api-auth-entity-storage-rest-client';

const adminClient = new EntityStorageAuthenticationAdminRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1'
});

const byEmail = await adminClient.get('ops@example.org');
const byIdentity = await adminClient.getByIdentity('did:example:ops:team');
await adminClient.remove('ops@example.org');

console.log(byEmail.email); // ops@example.org
console.log(byIdentity.userIdentity); // did:example:ops:team
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

await authClient.updatePassword('correct-horse-battery-staple', 'correct-horse-battery-staple-2');

const refreshResponse = await authClient.refresh(loginResponse.token);

await authClient.logout(refreshResponse.token);
console.log(refreshResponse.expiry > 0); // true
```
