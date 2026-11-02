# Class: IdentityProofHelper

Helper class for verifying the proof that a caller owns a DID bound to an account or registered
as an organization.

## Constructors

### Constructor

> **new IdentityProofHelper**(): `IdentityProofHelper`

#### Returns

`IdentityProofHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_MAX\_AGE\_SECONDS {#default_max_age_seconds}

> `readonly` `static` **DEFAULT\_MAX\_AGE\_SECONDS**: `number` = `300`

The default time a proof may be used for after it was created, in seconds.

## Methods

### verify() {#verify}

> `static` **verify**(`identityComponent`, `accountId`, `identity`, `proof`, `maxAgeSeconds`): `Promise`\<`void`\>

Verify the proof that the caller owns the DID being bound to the account. The proof must be
made with a verification method of the DID over the identity proof document, with or without
the node, and created recently.

#### Parameters

##### identityComponent

`IIdentityComponent`

The identity component.

##### accountId

`string`

The account the identity is bound to.

##### identity

`string`

The DID being bound.

##### proof

`IProof` \| `undefined`

The proof by the DID over the identity proof document.

##### maxAgeSeconds

`number`

How long the proof may be used for after it was created.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the proof has been verified.

#### Throws

UnauthorizedError when the proof is missing, is not by the DID, has expired or does not verify.

***

### verifyOrganization() {#verifyorganization}

> `static` **verifyOrganization**(`identityComponent`, `identity`, `proof`, `maxAgeSeconds`): `Promise`\<`void`\>

Verify the proof that the caller owns the DID being registered as an organization, made over
the organization proof document bound to the node, otherwise as for an account identity.

#### Parameters

##### identityComponent

`IIdentityComponent`

The identity component.

##### identity

`string`

The DID being registered.

##### proof

`IProof` \| `undefined`

The proof by the DID over the organization proof document.

##### maxAgeSeconds

`number`

How long the proof may be used for after it was created.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the proof has been verified.

#### Throws

UnauthorizedError when the proof is missing, is not by the DID, has expired or does not verify.
