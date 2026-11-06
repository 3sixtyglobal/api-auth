# API Auth OAuth Connector Entity Storage Examples

Register the connector so the password accounts held in entity storage sign in through the same OAuth 2.0 flow as the other providers, with the node acting as the authorization server.

## EntityStorageOAuthProviderConnector

```typescript
import { AuthenticationProviderFactory } from '@3sixty/api-auth-models';
import { EntityStorageOAuthProviderConnector } from '@3sixty/api-auth-oauth-connector-entity-storage';

AuthenticationProviderFactory.register(
  EntityStorageOAuthProviderConnector.NAMESPACE,
  () =>
    new EntityStorageOAuthProviderConnector({
      config: { loginPageUrl: 'https://app.example.org/login' }
    })
);

const provider = AuthenticationProviderFactory.get('3sixty-oauth');
console.log(provider.getCapabilities());
// { type: 'oauth2', signInMethod: 'password', passwordChange: 'api', profileReadOnly: false }
```

The sign in runs in these steps:

1. The browser opens `/authentication/oauth/3sixty-oauth/start`, which sends it to the login page with `response_type`, `redirect_uri`, `state`, `nonce`, `code_challenge` and `code_challenge_method` in the query.
2. The login page posts them, with the e-mail address and password, to `POST /authentication/authorize`. The password is checked and rate limited the same way as `POST /authentication/login`, and the response gives the `location` to send the browser to, the node's callback with a single use `code` and the `state`.
3. The callback redeems the code with this connector, which checks it has not expired or been used and matches the redirect address, nonce and PKCE code verifier, then signs the existing account in.

An app that runs the flow itself, rather than through the node's start and callback routes, sends the browser to the login page with its own `redirect_uri`, listed in the `authorizationRedirectUris` of the authentication service, and exchanges the code it receives at `POST /authentication/token` with its code verifier. Set `authorizationEndpoint` to the login page to publish the RFC 8414 metadata at `/.well-known/oauth-authorization-server`, so a standard OAuth 2.0 client can find both endpoints.

The accounts are the same ones `EntityStorageAuthenticationProviderConnector` signs in, so keep that connector registered as `3sixty` for sign up, password changes and resets. A client that only signs in through OAuth 2.0 lists the providers with `providers(['oauth2'])`, which leaves the password connector out.
