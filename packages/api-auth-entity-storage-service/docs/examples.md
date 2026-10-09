# Auth Entity Storage Service Examples

These snippets show how to wire authentication services into your component container and apply token processing in request pipelines.

## EntityStorageAuthenticationAdminService

```typescript
import { EntityStorageAuthenticationAdminService } from '@3sixty/api-auth-entity-storage-service';

const adminService = new EntityStorageAuthenticationAdminService();

console.log(adminService.className()); // EntityStorageAuthenticationAdminService

await adminService.create({
  email: 'owner@example.org',
  password: 'StartPassword123',
  userIdentity: 'did:example:owner',
  organizationIdentity: 'did:example:org',
  scope: ['admin']
});

await adminService.update({
  email: 'owner@example.org',
  scope: ['admin', 'security']
});

await adminService.updatePassword('owner@example.org', 'StartPassword124', 'StartPassword123');

const fromIdentity = await adminService.getByIdentity('did:example:owner');
console.log(fromIdentity.scope.length); // 2
```

```typescript
import { EntityStorageAuthenticationAdminService } from '@3sixty/api-auth-entity-storage-service';

const adminService = new EntityStorageAuthenticationAdminService();
const user = await adminService.get('owner@example.org');
await adminService.remove(user.email);

console.log(user.email); // owner@example.org
```

## EntityStorageAuthenticationService

```typescript
import { EntityStorageAuthenticationService } from '@3sixty/api-auth-entity-storage-service';

const authService = new EntityStorageAuthenticationService();

await authService.start('default');
console.log(authService.className()); // EntityStorageAuthenticationService

const loginResult = await authService.login('alice@example.org', 'correct-horse-battery-staple');

const refreshResult = await authService.refresh(loginResult.token);

await authService.updatePassword('correct-horse-battery-staple', 'correct-horse-battery-staple-2');

await authService.logout(refreshResult.token);
console.log(refreshResult.expiry > 0); // true
```

## EntityStorageAuthenticationRateService

```typescript
import { EntityStorageAuthenticationRateService } from '@3sixty/api-auth-entity-storage-service';
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
import { EntityStorageAuthenticationAuditService } from '@3sixty/api-auth-entity-storage-service';

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

## AuthHeaderProcessor

```typescript
import { AuthHeaderProcessor } from '@3sixty/api-auth-entity-storage-service';

const processor = new AuthHeaderProcessor();

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
```
