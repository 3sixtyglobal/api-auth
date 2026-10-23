# Auth Rest Client Examples

Use these snippets to record and query authentication audit entries from browser or server-side TypeScript applications.

## EntityStorageAuthenticationAuditRestClient

```typescript
import { EntityStorageAuthenticationAuditRestClient } from '@3sixty/api-auth-rest-client';

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

```typescript
import { EntityStorageAuthenticationAuditRestClient } from '@3sixty/api-auth-rest-client';

const auditClient = new EntityStorageAuthenticationAuditRestClient({
  endpoint: 'https://api.example.org',
  pathPrefix: 'v1'
});

const entry = await auditClient.get('018f2f67bb9d4a0caad8386f56df85ce');

await auditClient.update(entry.id, {
  data: {
    channel: 'mobile'
  }
});

await auditClient.remove(entry.id);

console.log(entry.event); // login-success
```
