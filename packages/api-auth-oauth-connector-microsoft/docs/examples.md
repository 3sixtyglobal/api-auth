# API Auth OAuth Connector Microsoft Examples

Register the connector with the application registered in Microsoft Entra.

## MicrosoftOAuthProviderConnector

```typescript
import { AuthenticationProviderFactory } from '@3sixty/api-auth-models';
import { MicrosoftOAuthProviderConnector } from '@3sixty/api-auth-oauth-connector-microsoft';

AuthenticationProviderFactory.register(
  MicrosoftOAuthProviderConnector.NAMESPACE,
  () =>
    new MicrosoftOAuthProviderConnector({
      config: {
        clientId: 'microsoft-client-id',
        clientSecret: 'microsoft-client-secret',
        tenant: 'organizations',
        allowedTenants: ['9188040d-6c67-4c5b-b112-36a304b66dad']
      }
    })
);
```

Profiles are read-only and edited on the Microsoft account page, `https://myaccount.microsoft.com/` for work accounts and `https://account.microsoft.com/profile` for personal ones. Passwords are changed at `https://mysignins.microsoft.com/security-info/password/change` for work accounts and `https://account.live.com/password/Change` for personal ones. Set `profileReadOnly`, `profileEditUrl`, `personalProfileEditUrl`, `passwordChangeUrl` or `personalPasswordChangeUrl` in the config to change these. The photo is fetched with at most 1 MiB and a 10 second timeout by default, set `avatar.maxBytes` and `avatar.timeoutMs` in the config to change these. A sign in returns the `tid` of the account as `providerTenantId`, which is stored with the account so `getCapabilities` gives the addresses for its kind of account later.

The ID token holds no photo, so at each sign in the photo is read from Microsoft Graph at `https://graph.microsoft.com/v1.0/me/photos/504x504/$value` with the access token of the code exchange, for work and personal accounts, and returned as the `avatar` of the identity, which the node stores read only as the account's avatar. The connector adds the delegated `User.Read` Microsoft Graph scope to the requested scopes, so the app registration needs the `User.Read` permission under API permissions, which a new registration has by default. A 404 means the account has no photo, and the avatar stored from Microsoft is removed. A photo that cannot be read keeps the stored avatar and is logged, set `loggingComponentType` in the options to log through another component.

The redirect address to register with Microsoft is `<public origin>/authentication/oauth/microsoft/callback`.

`tenant` is required, a tenant id accepts accounts from that tenant only, while `common`, `organizations` or `consumers` accept accounts from many tenants. `allowedTenants` limits sign in to the listed tenant ids.

Microsoft does not verify the `email` claim of a work account, so its e-mail address is only accepted when the ID token carries the `xms_edov` (email domain owner verified) claim set to true, or the account is from one of the `allowedTenants`. Otherwise the sign in fails with `emailNotVerified`. A personal account, from the consumer tenant `9188040d-6c67-4c5b-b112-36a304b66dad`, signs in with an address Microsoft has verified, so it is accepted without the claim when `tenant` is `common` or `consumers`, and `allowedTenants` is unset or includes that id. `xms_edov` is an optional claim, add it to the ID token in the Token configuration of the app registration in Microsoft Entra, or in the `optionalClaims` of the app manifest:

```json
{
  "optionalClaims": {
    "idToken": [{ "name": "xms_edov", "essential": false }]
  }
}
```
