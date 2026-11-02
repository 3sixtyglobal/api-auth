# Interface: IAccountIdentityAdoptRequest

Adopt an identity for the signed in account.

## Properties

### body {#body}

> **body**: `object`

The identity to adopt, an empty object creates a new self-controlled DID. The body is required
so a cross-site form post cannot adopt an identity.

#### identity?

> `optional` **identity?**: `string`

The DID to adopt.

#### proof?

> `optional` **proof?**: `IProof`

A proof by the DID over the identity proof document, required with the identity.
