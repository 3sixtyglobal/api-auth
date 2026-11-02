# Class: EmailHelper

Helper methods for e-mail addresses.

## Constructors

### Constructor

> **new EmailHelper**(): `EmailHelper`

#### Returns

`EmailHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### normalise() {#normalise}

> `static` **normalise**(`email`): `string`

Normalise an e-mail address so addresses that differ only by case or surrounding spaces match.

#### Parameters

##### email

`string` \| `undefined`

The e-mail address.

#### Returns

`string`

The trimmed, lower case address, or an empty string when there is none.
