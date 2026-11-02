# Class: VerifiableCredentialAccountDataVerifier

Verifies a verifiable credential item, a credential in its JSON form with a proof.

## Implements

- `IAccountDataVerifier`

## Constructors

### Constructor

> **new VerifiableCredentialAccountDataVerifier**(): `VerifiableCredentialAccountDataVerifier`

#### Returns

`VerifiableCredentialAccountDataVerifier`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### verify() {#verify}

> **verify**(`data`, `accountOwned`): `Promise`\<`void`\>

Verify the value of a verifiable credential item.

#### Parameters

##### data

`unknown`

The value of the item.

##### accountOwned

`boolean`

True when the account sets the value itself, rather than an admin or an
authentication provider.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the value is valid.

#### Throws

UnprocessableError when it is not a credential in its JSON form.

#### Implementation of

`IAccountDataVerifier.verify`

***

### maxInstances() {#maxinstances}

> **maxInstances**(): `number` \| `undefined`

The most items of the type an account may hold.

#### Returns

`number` \| `undefined`

Undefined, there is no limit other than the configured ones.

#### Implementation of

`IAccountDataVerifier.maxInstances`
