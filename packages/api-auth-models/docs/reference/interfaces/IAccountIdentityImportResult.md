# Interface: IAccountIdentityImportResult

The result of importing an identity into an account.

## Properties

### identity {#identity}

> **identity**: `string`

The DID of the account.

***

### credentialsImported {#credentialsimported}

> **credentialsImported**: `number`

The number of credentials stored.

***

### credentialsSkipped {#credentialsskipped}

> **credentialsSkipped**: `number`

The number of credentials left out, as they did not verify, were revoked or were not issued
to the identity.

***

### organizations {#organizations}

> **organizations**: `string`[]

The registered organizations the account became a member of through its credentials.
