# API Auth OAuth Models Examples

Use these contracts and helpers to build an OAuth provider connector for an OpenID Connect provider.

## OidcHelper

```typescript
import { OidcHelper } from '@3sixty/api-auth-oauth-models';

const config = { clientId: 'client-id', clientSecret: 'client-secret' };

const location = OidcHelper.authorizationUrl('https://issuer.example.org/authorize', config, {
  state: 'state',
  nonce: 'nonce',
  codeChallenge: 'code-challenge',
  redirectUri: 'https://node.example.org/authentication/oauth/example/callback'
});

const idToken = await OidcHelper.exchangeCode('https://issuer.example.org/token', config, {
  code: 'authorization-code',
  codeVerifier: 'code-verifier',
  redirectUri: 'https://node.example.org/authentication/oauth/example/callback',
  nonce: 'nonce'
});

const payload = await OidcHelper.verifyIdToken(idToken, {
  jwksUri: 'https://issuer.example.org/keys',
  audience: config.clientId,
  nonce: 'nonce',
  isIssuer: issuer => issuer === 'https://issuer.example.org'
});

const identity = OidcHelper.toIdentity(payload);
console.log(identity.profile?.['@type']); // Person

// The access token issued with the ID token, to call the provider's APIs.
const { accessToken } = await OidcHelper.exchangeCodeForTokens(
  'https://issuer.example.org/token',
  config,
  {
    code: 'authorization-code',
    codeVerifier: 'code-verifier',
    redirectUri: 'https://node.example.org/authentication/oauth/example/callback',
    nonce: 'nonce'
  }
);
```

## AvatarHelper

Fetch the photo a provider holds as a schema.org `ImageObject` with a data URL, for the `avatar` of the identity. The response must be `image/jpeg`, `image/png` or `image/webp`, the content type is kept, and the size given is set as the `width` and `height`. A 404 or another content type gives `null`, the provider holds no photo. A failure, a timeout after 10 seconds or a body over 1 MiB is logged with the logging component given and gives `undefined`, so a stored avatar is kept and the sign in goes on.

```typescript
import { AvatarHelper } from '@3sixty/api-auth-oauth-models';

const avatar = await AvatarHelper.fetch(
  'https://photos.example.org/me',
  { width: 512, height: 512 },
  { authorization: `Bearer ${accessToken}` }
);
```
