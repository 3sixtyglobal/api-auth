# Interface: IEntityStorageAuthenticationProviderConnectorConfig

Configuration for the entity storage authentication provider connector.

## Properties

### passwordHashOptions? {#passwordhashoptions}

> `optional` **passwordHashOptions?**: `IPasswordHashOptions`

The Argon2id parameters a password is hashed with again after a sign in, when its hash is a
legacy hash or uses other parameters. A sign in for an unknown account, or one with a legacy
hash, hashes the password with them too, so it takes as long as one for a known account. Set
them to the passwordHashOptions of the authentication service, which hashes new passwords,
otherwise the time taken can reveal whether an account exists and passwords are hashed again
with each set of parameters in turn.
