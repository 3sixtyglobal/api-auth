# Auth Service Examples

These snippets show how to apply rate limiting, record authentication audit entries and allow privileged callers to override the tenant of a request.

## EntityStorageAuthenticationRateService

```typescript
import { EntityStorageAuthenticationRateService } from '@3sixty/api-auth-service';
import { BaseError, GeneralError } from '@3sixty/core';
import { TooManyRequestsError } from '@3sixty/api-models';

const rateService = new EntityStorageAuthenticationRateService({
  config: {
    cleanupIntervalMinutes: 5
  }
});

console.log(rateService.className()); // EntityStorageAuthenticationRateService

await rateService.registerAction('login', {
  maxAttempts: 3,
  windowMinutes: 15
});

await rateService.start('default');

await rateService.check('login', 'alice@example.org');
await rateService.check('login', 'alice@example.org');
await rateService.check('login', 'alice@example.org');

try {
  await rateService.check('login', 'alice@example.org');
} catch (error) {
  if (BaseError.isErrorName(error, TooManyRequestsError.CLASS_NAME)) {
    const tooMany = error as TooManyRequestsError;
    console.log(tooMany.properties?.retryAfterSeconds); // 900
    console.log(tooMany.properties?.nextRequestTime); // 2026-04-13T10:15:00.000Z
  }
}

await rateService.clear('login', 'alice@example.org');
await rateService.unregisterAction('login');

try {
  await rateService.check('login', 'alice@example.org');
} catch (error) {
  if (BaseError.isErrorName(error, GeneralError.CLASS_NAME)) {
    console.log((error as GeneralError).name); // GeneralError
  }
}

await rateService.stop('default');
```

## EntityStorageAuthenticationAuditService

```typescript
import { EntityStorageAuthenticationAuditService } from '@3sixty/api-auth-service';

const auditService = new EntityStorageAuthenticationAuditService({
  config: {
    ipHashSalt: 'StrongServerSideSaltForAuditHashing123'
  }
});

console.log(auditService.className()); // EntityStorageAuthenticationAuditService

const createdAuditId = await auditService.create({
  event: 'login-failure',
  actorId: 'did:example:user:alice',
  nodeId: 'did:example:node:eu-west-1',
  organizationId: 'did:example:org:core',
  tenantId: 'did:example:tenant:alpha',
  data: {
    reason: 'invalid-password'
  }
});

const auditPage = await auditService.query(
  {
    actorId: 'did:example:user:alice',
    event: 'login-failure',
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-04-30T23:59:59.999Z'
  },
  undefined,
  50
);

console.log(createdAuditId); // 018f2f67bb9d4a0caad8386f56df85ce
console.log(auditPage.entries.length); // 1
console.log(auditPage.cursor); // eyJpZCI6IjAxOGYyZjY3YmI5ZDRhMGNhYWQ4Mzg2ZjU2ZGY4NWNlIn0=
```

## TenantOverrideProcessor

The processor runs after `AuthHeaderProcessor`. A caller holding the escalated privilege role can supply the `override-tenant` query parameter to act on another tenant.

```typescript
import { TenantOverrideProcessor } from '@3sixty/api-auth-service';

const processor = new TenantOverrideProcessor({
  tenantAdminComponentType: 'tenant-admin',
  authorizationComponentType: 'authorization',
  config: {
    escalatedPrivilegeRole: 'global-admin',
    authorizationModelId: 'system'
  }
});

console.log(processor.className()); // TenantOverrideProcessor

const request = {
  method: 'get',
  url: '/authentication/audit?override-tenant=did:example:tenant:beta',
  query: {
    'override-tenant': 'did:example:tenant:beta'
  }
};

const response = {};
const contextIds = {
  user: 'did:example:user:admin',
  tenant: 'did:example:tenant:alpha'
};
const processorState: { [id: string]: unknown } = {};

await processor.pre(
  request,
  response,
  { operationId: 'auditQuery', path: '/' },
  contextIds,
  processorState
);

console.log(contextIds.tenant); // did:example:tenant:beta
```
