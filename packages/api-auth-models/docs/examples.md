# Auth Models Examples

Use these snippets to shape authentication audit entries, audit queries and rate limit configuration consistently across services and clients.

## Audit Entries

```typescript
import { AuthAuditEvent, type IAuthenticationAuditEntry } from '@3sixty/api-auth-models';

const entry: IAuthenticationAuditEntry = {
  id: '018f2f67bb9d4a0caad8386f56df85ce',
  event: AuthAuditEvent.LoginFailure,
  dateCreated: '2026-04-13T10:00:00.000Z',
  actorId: 'did:example:user:alice',
  tenantId: 'did:example:tenant:alpha',
  data: {
    reason: 'invalid-password'
  }
};

console.log(entry.event); // login-failure
```

## Audit Requests

```typescript
import type { IAuditCreateRequest, IAuditQueryRequest } from '@3sixty/api-auth-models';

const createRequest: IAuditCreateRequest = {
  body: {
    event: 'account-locked',
    actorId: 'did:example:user:alice'
  }
};

const queryRequest: IAuditQueryRequest = {
  query: {
    actorId: 'did:example:user:alice',
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-04-30T23:59:59.999Z',
    limit: '25'
  }
};

console.log(createRequest.body.event); // account-locked
console.log(queryRequest.query?.limit); // 25
```

## Rate Limit Configuration

```typescript
import type { IAuthenticationRateActionConfig } from '@3sixty/api-auth-models';

const loginLimit: IAuthenticationRateActionConfig = {
  maxAttempts: 5,
  windowMinutes: 15
};

console.log(loginLimit.maxAttempts); // 5
```
