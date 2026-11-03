# Class: AvatarHelper

Helper class for fetching the photo an authentication provider holds for an account.

## Constructors

### Constructor

> **new AvatarHelper**(): `AvatarHelper`

#### Returns

`AvatarHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### CONTENT\_TYPES {#content_types}

> `readonly` `static` **CONTENT\_TYPES**: `string`[]

The content types a photo is accepted in.

***

### DEFAULT\_MAX\_BYTES {#default_max_bytes}

> `readonly` `static` **DEFAULT\_MAX\_BYTES**: `number` = `1048576`

The largest photo accepted, in bytes, when the options give no limit.

***

### DEFAULT\_TIMEOUT\_MS {#default_timeout_ms}

> `readonly` `static` **DEFAULT\_TIMEOUT\_MS**: `number`

How long to wait for a photo, in milliseconds, when the options give no timeout.

## Methods

### fetch() {#fetch}

> `static` **fetch**(`url`, `size`, `headers?`, `logging?`, `options?`): `Promise`\<`WithContext`\<`ImageObjectLeaf`\> \| `null` \| `undefined`\>

Fetch a photo as a schema.org ImageObject holding a data URL. A failure is logged and never
thrown, so it can not fail a sign in.

#### Parameters

##### url

`string`

The address of the photo.

##### size

The size requested from the provider.

###### width

`number`

The width in pixels.

###### height

`number`

The height in pixels.

##### headers?

\{\[`name`: `string`\]: `string`; \}

The headers to send.

##### logging?

`ILoggingComponent`

The logging component to log a failure with.

##### options?

[`IAvatarFetchOptions`](../interfaces/IAvatarFetchOptions.md)

The limits to fetch the photo with, the defaults when left out.

#### Returns

`Promise`\<`WithContext`\<`ImageObjectLeaf`\> \| `null` \| `undefined`\>

The photo, null when the provider holds none, or undefined when it could not be fetched.
