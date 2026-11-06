# API Auth Connector Entity Storage Examples

Register the connector so password logins are verified against the accounts held in entity storage.

## EntityStorageAuthenticationProviderConnector

```typescript
import { EntityStorageAuthenticationProviderConnector } from '@3sixty/api-auth-connector-entity-storage';
import { AuthenticationProviderFactory } from '@3sixty/api-auth-models';

AuthenticationProviderFactory.register(
  EntityStorageAuthenticationProviderConnector.NAMESPACE,
  () =>
    new EntityStorageAuthenticationProviderConnector({
      config: { passwordHashOptions: { memoryKiB: 19456, iterations: 2, parallelism: 1 } }
    })
);

const provider = AuthenticationProviderFactory.get('3sixty');
const identity = await provider.authenticate({
  email: 'alice@example.org',
  password: 'correct-horse-battery-staple'
});

console.log(identity.providerAccountId); // alice@example.org
```

The e-mail address is matched in lower case, and an account stored before addresses were normalised is still found by the address as stored. A password stored with the earlier Blake2b hash is checked and, once it matches, hashed again with Argon2id using `passwordHashOptions`, as is a password hashed with other parameters. A legacy address is stored in lower case at the same time unless another password account already uses it. The account is only written when it has not changed since it was read, and never written again once removed, and its password version is kept so its sessions continue. An unknown address, or an account with a Blake2b hash, still computes an Argon2id hash, so it takes as long as a wrong password. Set `passwordHashOptions` to those the authentication service hashes new passwords with, otherwise the time taken can reveal whether an account exists.
