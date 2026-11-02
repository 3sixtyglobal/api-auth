# Class: ExportFileHelper

Helper methods for the type and version every exported file carries, so an import is refused
before anything is changed when it is given the wrong kind of file.

## Constructors

### Constructor

> **new ExportFileHelper**(): `ExportFileHelper`

#### Returns

`ExportFileHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### VERSION {#version}

> `readonly` `static` **VERSION**: `number` = `1`

The version of the exported files.

## Methods

### isType() {#istype}

> `static` **isType**(`file`, `type`): `boolean`

Check a file is of the type and version expected, a quick check a client can make before
asking to import it, such as before replacing an identity.

#### Parameters

##### file

`unknown`

The parsed file.

##### type

[`ExportFileType`](../type-aliases/ExportFileType.md)

The type expected.

#### Returns

`boolean`

True when the file has the type and version expected.

***

### guard() {#guard}

> `static` **guard**(`file`, `type`): `void`

Ensure a file is of the type and version expected, checked before anything else an import does.
Nothing else of the file is put in the error, as it may hold keys.

#### Parameters

##### file

`unknown`

The parsed file.

##### type

[`ExportFileType`](../type-aliases/ExportFileType.md)

The type expected.

#### Returns

`void`

#### Throws

UnprocessableError with the key fileTypeMismatch when the file is of another type, or
fileVersionUnsupported when it is of another version.
