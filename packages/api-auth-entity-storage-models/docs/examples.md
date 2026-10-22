# Auth Entity Storage Models Examples

Use these snippets to shape request and response data consistently across sign-in flows, admin operations, and token refresh handling.

## Authentication Requests

```typescript
import type {
  ILoginRequest,
  IRefreshTokenRequest,
  IUpdatePasswordRequest
} from '@3sixty/api-auth-entity-storage-models';

const loginRequest: ILoginRequest = {
  body: {
    email: 'alice@example.org',
    password: 'correct-horse-battery-staple'
  }
};

const refreshRequest: IRefreshTokenRequest = {
  body: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh'
  }
};

const updatePasswordRequest: IUpdatePasswordRequest = {
  body: {
    currentPassword: 'old-password',
    newPassword: 'new-password-2026'
  }
};

console.log(loginRequest.body.email); // alice@example.org
```

## Admin User Models

```typescript
import type {
  IAdminUserCreateRequest,
  IAdminUserUpdateRequest
} from '@3sixty/api-auth-entity-storage-models';

const createRequest: IAdminUserCreateRequest = {
  body: {
    email: 'bob@example.org',
    password: 'initial-password',
    userIdentity: 'did:example:bob',
    organizationIdentity: 'did:example:org'
  }
};

const updateRequest: IAdminUserUpdateRequest = {
  pathParams: {
    email: 'bob@example.org'
  },
  body: {
    userIdentity: 'did:example:bob:ops'
  }
};

console.log(updateRequest.body.userIdentity); // did:example:bob:ops
```

## Authentication Responses

```typescript
import type {
  ILoginResponse,
  IPasswordPolicyResponse
} from '@3sixty/api-auth-entity-storage-models';

const loginResponse: ILoginResponse = {
  body: {
    expiry: 3600
  }
};

const passwordPolicyResponse: IPasswordPolicyResponse = {
  body: {
    minPasswordLength: 8,
    maxPasswordLength: 128
  }
};

console.log(loginResponse.body.expiry); // 3600
console.log(passwordPolicyResponse.body.minPasswordLength); // 8
```
