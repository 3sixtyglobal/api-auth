# API Auth OAuth Service Examples

Register the service and its routes to let people sign in through the OAuth providers registered with the authentication provider factory.

## OAuthService

```typescript
import { OAuthService } from '@3sixty/api-auth-oauth-service';
import { ComponentFactory } from '@3sixty/core';

ComponentFactory.register(
  'oauth',
  () =>
    new OAuthService({
      vaultConnectorType: 'vault',
      config: {
        successRedirectUrl: 'https://app.example.org/',
        failureRedirectUrl: 'https://app.example.org/login',
        transactionSigningKeyName: 'auth-oauth-transaction'
      }
    })
);
```

The sign in is kept by the browser in the `oauth_transaction` cookie, signed with the `<node id>/<transactionSigningKeyName>` key in the vault, `auth-oauth-transaction` by default, which is created on first use and kept apart from the key that signs session tokens. A sign in started before the update, signed with the `<node id>/<signingKeyName>` key, `auth-signing` by default, is still accepted. Set `transactionSigningKeyName` to the session token key to sign with it as earlier versions did. A changed or unsigned transaction fails the sign in.

## Routes

```typescript
import { generateRestRoutesOAuth } from '@3sixty/api-auth-oauth-service';

const routes = generateRestRoutesOAuth('authentication/oauth', 'oauth');

console.log(routes.map(route => route.path));
// authentication/oauth/:authProviderId/start
// authentication/oauth/:authProviderId/callback
```

Send the browser to `/authentication/oauth/google/start`, which answers 404 Not Found for a provider that is not registered or does not sign in through OAuth. After the provider sends it back, the session cookie is set and the browser goes to the success address, or to the failure address with an `error` of `providerDisabled`, `oauthCancelled` or `oauthFailed`.

Logins through a provider are rate limited per client address, or per provider account without a trusted client address, by the authentication service, and the ID token must carry the nonce sent with the authorization request.
