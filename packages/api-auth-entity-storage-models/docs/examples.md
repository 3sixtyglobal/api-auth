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

```typescript
import type { IUpdatePasswordResponse } from '@3sixty/api-auth-entity-storage-models';

// The token is only in the body when the request was not signed in by cookie.
const updatePasswordResponse: IUpdatePasswordResponse = {
  body: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.session',
    expiry: 1722514341067
  }
};

console.log(updatePasswordResponse.body.expiry > 0); // true
```

## Admin User Models

```typescript
import type {
  IAdminUserCreateRequest,
  IAdminUserGetResponse
} from '@3sixty/api-auth-entity-storage-models';

const createRequest: IAdminUserCreateRequest = {
  body: {
    email: 'bob@example.org',
    password: 'initial-password'
  }
};

const getResponse: IAdminUserGetResponse = {
  body: {
    email: 'bob@example.org',
    accountId: '6f1c2c0e-4b7a-4f0e-9c1a-2d3e4f5a6b7c'
  }
};

console.log(getResponse.body.accountId); // 6f1c2c0e-4b7a-4f0e-9c1a-2d3e4f5a6b7c
```

```typescript
import type {
  IAdminUserGetByIdentityRequest,
  IAdminUserUpdateRequest
} from '@3sixty/api-auth-entity-storage-models';

const updateRequest: IAdminUserUpdateRequest = {
  pathParams: { email: 'bob@example.org' },
  body: {
    userIdentity: 'did:example:bob',
    organizationIdentity: 'did:example:org'
  }
};

const getByIdentityRequest: IAdminUserGetByIdentityRequest = {
  pathParams: { identity: 'did:example:bob' }
};

console.log(updateRequest.body.userIdentity === getByIdentityRequest.pathParams.identity); // true
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

## Sign Up and the Signed In Account

```typescript
import type {
  IMeResponse,
  IRegisterAcceptedResponse,
  IRegisterRequest,
  IRegisterVerifyRequest
} from '@3sixty/api-auth-entity-storage-models';

const registerRequest: IRegisterRequest = {
  body: {
    email: 'carol@example.org',
    password: 'correct-horse-battery-staple',
    givenName: 'Carol',
    familyName: 'Smith'
  }
};

// A sign up that must verify its e-mail address is accepted without a body.
const registerResponse: IRegisterAcceptedResponse = { statusCode: 202 };

const verifyRequest: IRegisterVerifyRequest = {
  body: { token: 'token-from-the-link' }
};

const meResponse: IMeResponse = {
  body: {
    accountId: '01a17afb-e05f-7939-83f2-d4f04c4bdf2e',
    email: 'carol@example.org',
    authProviderId: '3sixty',
    profileReadOnly: false,
    identity: 'did:example:carol'
  }
};

console.log(registerRequest.body.email); // carol@example.org
console.log(registerResponse.statusCode); // 202
console.log(verifyRequest.body.token); // token-from-the-link
console.log(meResponse.body.authProviderId); // entity-storage
```

## Forgotten Password and Account Administration

```typescript
import type {
  IAdminUserQueryResponse,
  IPasswordForgotRequest,
  IPasswordResetRequest
} from '@3sixty/api-auth-entity-storage-models';

const forgotRequest: IPasswordForgotRequest = {
  body: {
    email: 'carol@example.org'
  }
};

const resetRequest: IPasswordResetRequest = {
  body: {
    token: 'token-from-the-link',
    newPassword: 'correct-horse-battery-staple-2'
  }
};

const queryResponse: IAdminUserQueryResponse = {
  body: {
    entities: [
      {
        email: 'carol@example.org',
        accountId: '01a17afb-e05f-7939-83f2-d4f04c4bdf2e',
        authProviderId: '3sixty',
        dateDisabled: '2026-01-13T10:00:00.000Z'
      }
    ]
  }
};

console.log(forgotRequest.body.email); // carol@example.org
console.log(resetRequest.body.token); // token-from-the-link
console.log(queryResponse.body.entities[0].dateDisabled); // 2026-01-13T10:00:00.000Z
```
