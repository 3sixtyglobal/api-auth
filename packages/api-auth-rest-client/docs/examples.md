# Auth Entity Storage Rest Client Examples

Use these snippets to integrate sign-in and user administration flows from browser or server-side TypeScript applications.

## EntityStorageAuthenticationAdminRestClient

```typescript
import { EntityStorageAuthenticationAdminRestClient } from '@twin.org/api-auth-entity-storage-rest-client';

const adminClient = new EntityStorageAuthenticationAdminRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1'
});

console.log(adminClient.className()); // EntityStorageAuthenticationAdminRestClient

await adminClient.create({
  email: 'ops@example.org',
  password: 'StrongPassword123',
  userIdentity: 'did:example:ops',
  organizationIdentity: 'did:example:core',
  scope: ['admin']
});

await adminClient.update({
  email: 'ops@example.org',
  userIdentity: 'did:example:ops:team',
  scope: ['admin', 'support']
});

await adminClient.updatePassword('ops@example.org', 'StrongPassword124', 'StrongPassword123');
const adminUser = await adminClient.get('ops@example.org');
console.log(adminUser.email); // ops@example.org
```

```typescript
import { EntityStorageAuthenticationAdminRestClient } from '@twin.org/api-auth-entity-storage-rest-client';

const adminClient = new EntityStorageAuthenticationAdminRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1'
});

const byEmail = await adminClient.get('ops@example.org');
const byIdentity = await adminClient.getByIdentity('ops-team@example.org');
await adminClient.remove('ops@example.org');

console.log(byEmail.email); // ops@example.org
console.log(byIdentity.userIdentity); // did:example:ops:team
```

## EntityStorageAuthenticationRestClient

```typescript
import { EntityStorageAuthenticationRestClient } from '@twin.org/api-auth-entity-storage-rest-client';

const authClient = new EntityStorageAuthenticationRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1',
  cookieName: 'access_token'
});

console.log(authClient.className()); // EntityStorageAuthenticationRestClient

const loginResponse = await authClient.login('alice@example.org', 'correct-horse-battery-staple');

await authClient.updatePassword('correct-horse-battery-staple', 'correct-horse-battery-staple-2');

const refreshResponse = await authClient.refresh(loginResponse.token);

await authClient.logout(refreshResponse.token);
console.log(refreshResponse.expiry > 0); // true
```

## EntityStorageAuthenticationAuditRestClient

```typescript
import { EntityStorageAuthenticationAuditRestClient } from '@twin.org/api-auth-entity-storage-rest-client';

const auditClient = new EntityStorageAuthenticationAuditRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1'
});

console.log(auditClient.className()); // EntityStorageAuthenticationAuditRestClient

const auditEntryId = await auditClient.create({
  event: 'login-success',
  actorId: 'did:example:user:alice',
  organizationId: 'did:example:org:core',
  tenantId: 'did:example:tenant:alpha',
  data: {
    channel: 'web'
  }
});

const auditResult = await auditClient.query(
  {
    actorId: 'did:example:user:alice',
    event: 'login-success',
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-04-30T23:59:59.999Z'
  },
  undefined,
  25
);

console.log(auditEntryId); // /authentication/audit/018f2f67bb9d4a0caad8386f56df85ce
console.log(auditResult.entries.length); // 1
console.log(auditResult.cursor); // eyJpZCI6IjAxOGYyZjY3YmI5ZDRhMGNhYWQ4Mzg2ZjU2ZGY4NWNlIn0=
```
