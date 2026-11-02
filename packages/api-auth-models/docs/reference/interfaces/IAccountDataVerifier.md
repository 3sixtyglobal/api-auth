# Interface: IAccountDataVerifier

Verifies the value of an account data item of one type before it is stored.

## Methods

### verify() {#verify}

> **verify**(`data`, `accountOwned`): `Promise`\<`void`\>

Verify the value of an item, throwing when it is not valid for the type.

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

UnprocessableError when the value is not valid for the type.

***

### maxInstances() {#maxinstances}

> **maxInstances**(): `number` \| `undefined`

The most items of the type an account may hold. When it is one, a new item replaces the one the
account holds, otherwise a new item is refused once the account holds that many.

#### Returns

`number` \| `undefined`

The most items, or undefined for no limit other than the configured ones.
