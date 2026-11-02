# Class: PublicDataHelper

Helper class for the public data of an account or organization, the paths of its data that are
public. The first segment of a path is an account data type, any further segments a nested
property of its value, such as logo, profile.address or profile.address.addressLocality.

## Constructors

### Constructor

> **new PublicDataHelper**(): `PublicDataHelper`

#### Returns

`PublicDataHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### MAX\_PATHS {#max_paths}

> `readonly` `static` **MAX\_PATHS**: `number` = `100`

The most paths the public data may hold.

***

### MAX\_PATH\_LENGTH {#max_path_length}

> `readonly` `static` **MAX\_PATH\_LENGTH**: `number` = `255`

The longest path, in characters.

## Methods

### validatePaths() {#validatepaths}

> `static` **validatePaths**(`paths`): `string`[]

Check a list of paths.

#### Parameters

##### paths

`unknown`

The paths.

#### Returns

`string`[]

The paths.

#### Throws

UnprocessableError when the list or a path is not valid.

***

### createData() {#createdata}

> `static` **createData**(`paths`): `object`

Build the value of a public data item.

#### Parameters

##### paths

`string`[]

The paths, checked first.

#### Returns

`object`

The value.

##### @context

> **@context**: `string`

##### @type

> **@type**: `string`

##### itemListElement

> **itemListElement**: `string`[]

#### Throws

UnprocessableError when a path is not valid.

***

### getPaths() {#getpaths}

> `static` **getPaths**(`data`, `strict?`): `string`[]

Get the paths of the value of a public data item.

#### Parameters

##### data

`unknown`

The value.

##### strict?

`boolean`

True to refuse a value that is not valid, otherwise it holds no paths.

#### Returns

`string`[]

The paths.

#### Throws

UnprocessableError when strict and the value is not valid.

***

### build() {#build}

> `static` **build**(`values`, `paths`, `identifier?`): `object`[]

Build the public JSON-LD objects from the values of the types the paths name. Each type with
data gives one object with the context and type of its value and the properties selected, the
whole value when a path names the type. Paths that do not resolve are skipped.

#### Parameters

##### values

\{\[`type`: `string`\]: `unknown`; \}

The values by account data type.

##### paths

`string`[]

The paths.

##### identifier?

`string`

The DID of the owner, added to each object that has no identifier.

#### Returns

`object`[]

The objects.
