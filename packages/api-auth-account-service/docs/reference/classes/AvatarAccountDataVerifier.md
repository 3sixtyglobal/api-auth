# Class: AvatarAccountDataVerifier

Verifies an avatar item, a schema.org ImageObject holding a base64 data URL. An avatar the
account sets is a JPEG up to the largest avatar, one marked read only is owned by an
authentication provider, so it may be in any of the provider content types and up to the larger
size, and the account may not mark its own avatar read only.

## Implements

- `IAccountDataVerifier`

## Constructors

### Constructor

> **new AvatarAccountDataVerifier**(): `AvatarAccountDataVerifier`

#### Returns

`AvatarAccountDataVerifier`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### verify() {#verify}

> **verify**(`data`, `accountOwned`): `Promise`\<`void`\>

Verify the value of an avatar item.

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

UnprocessableError when it is not an avatar image or is too large.

#### Implementation of

`IAccountDataVerifier.verify`

***

### maxInstances() {#maxinstances}

> **maxInstances**(): `number` \| `undefined`

The most avatar items an account may hold, one, so a new avatar replaces it.

#### Returns

`number` \| `undefined`

One.

#### Implementation of

`IAccountDataVerifier.maxInstances`
