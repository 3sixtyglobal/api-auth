# API Auth OAuth Connector Google Examples

Register the connector with the client created in the Google Cloud console.

## GoogleOAuthProviderConnector

```typescript
import { AuthenticationProviderFactory } from '@3sixty/api-auth-models';
import { GoogleOAuthProviderConnector } from '@3sixty/api-auth-oauth-connector-google';

AuthenticationProviderFactory.register(
  GoogleOAuthProviderConnector.NAMESPACE,
  () =>
    new GoogleOAuthProviderConnector({
      config: {
        clientId: 'google-client-id',
        clientSecret: 'google-client-secret',
        allowedDomains: ['example.com']
      }
    })
);
```

Profiles are read-only and edited on the Google account page, and passwords are changed on its security page. Set `profileReadOnly`, `profileEditUrl` or `passwordChangeUrl` in the config to change these. The photo is fetched with at most 1 MiB and a 10 second timeout by default, set `avatar.maxBytes` and `avatar.timeoutMs` in the config to change these.

The photo in the `picture` claim of the ID token is fetched at 512 by 512 pixels at each sign in and returned as the `avatar` of the identity, which the node stores read only as the account's avatar. The size option of the address is replaced with `=s512-c`, or the size path segment, such as `s96-c`, of an older address. Only `https` addresses on `googleusercontent.com` and `ggpht.com` and their subdomains are fetched, any other address or no claim means no photo, and the avatar stored from Google is removed. A photo that cannot be fetched keeps the stored avatar and is logged, set `loggingComponentType` in the options to log through another component.

The redirect address to register with Google is `<public origin>/authentication/oauth/google/callback`.

Only accounts with an e-mail address Google has verified can sign in. `allowedDomains` limits sign in to Google Workspace accounts of the listed domains, matched on the hosted domain (`hd`) claim only. Accounts without the claim, such as `gmail.com` accounts, are refused even when the domain of the e-mail address is listed. Without `allowedDomains` anyone with a Google account can sign in and is given an account, a node can be set to refuse that by turning open registration off.
