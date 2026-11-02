# Class: AuthenticationAccountHelper

Helper methods for account data.

## Constructors

### Constructor

> **new AuthenticationAccountHelper**(): `AuthenticationAccountHelper`

#### Returns

`AuthenticationAccountHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### READ\_ONLY\_PROPERTY {#read_only_property}

> `readonly` `static` **READ\_ONLY\_PROPERTY**: `string` = `"readonlyValue"`

The schema.org property set to true on account data the account may not change, such as a
profile owned by an authentication provider.

## Methods

### createIdentityData() {#createidentitydata}

> `static` **createIdentityData**(`identity`): [`IAccountIdentityData`](../interfaces/IAccountIdentityData.md)

Build the value of an identity item.

#### Parameters

##### identity

`string`

The DID of the account.

#### Returns

[`IAccountIdentityData`](../interfaces/IAccountIdentityData.md)

The value.

***

### getIdentity() {#getidentity}

> `static` **getIdentity**(`data`): `string` \| `undefined`

Get the DID from the value of an identity item.

#### Parameters

##### data

`unknown`

The value of the item.

#### Returns

`string` \| `undefined`

The DID, or undefined when the value is not an identity.

***

### createOrganizationData() {#createorganizationdata}

> `static` **createOrganizationData**(`organization`): [`IAccountOrganizationData`](../interfaces/IAccountOrganizationData.md)

Build the value of an organization item.

#### Parameters

##### organization

`string`

The DID of the organization.

#### Returns

[`IAccountOrganizationData`](../interfaces/IAccountOrganizationData.md)

The value.

***

### getOrganization() {#getorganization}

> `static` **getOrganization**(`data`): `string` \| `undefined`

Get the DID from the value of an organization item.

#### Parameters

##### data

`unknown`

The value of the item.

#### Returns

`string` \| `undefined`

The DID, or undefined when the value is not an organization.

***

### getCredential() {#getcredential}

> `static` **getCredential**(`data`): `IDidVerifiableCredential` \| `undefined`

Get the credential from the value of a verifiable credential item, a JSON credential object with
a context, the VerifiableCredential type, an issuer, a credential subject and a proof.

#### Parameters

##### data

`unknown`

The value of the item.

#### Returns

`IDidVerifiableCredential` \| `undefined`

The credential, or undefined when the value is not a JSON credential.

***

### getCredentialIssuer() {#getcredentialissuer}

> `static` **getCredentialIssuer**(`credential`): `string` \| `undefined`

Get the DID of the issuer of a credential.

#### Parameters

##### credential

`IDidVerifiableCredential`

The credential.

#### Returns

`string` \| `undefined`

The issuer, or undefined when it has none.

***

### getCredentialSubjects() {#getcredentialsubjects}

> `static` **getCredentialSubjects**(`credential`): `IJsonLdNodeObject`[]

Get the subjects of a credential.

#### Parameters

##### credential

`IDidVerifiableCredential`

The credential.

#### Returns

`IJsonLdNodeObject`[]

The subjects that are objects.

***

### getCredentialRevocationIndex() {#getcredentialrevocationindex}

> `static` **getCredentialRevocationIndex**(`credential`): `number` \| `undefined`

Get the revocation index of a credential from the revocationBitmapIndex of its status, which
may be written as a string.

#### Parameters

##### credential

`IDidVerifiableCredential`

The credential.

#### Returns

`number` \| `undefined`

The revocation index, or undefined when it has none.

***

### identityItemId() {#identityitemid}

> `static` **identityItemId**(`identity`): `string`

Get the id of the account data item holding an identity. Storage only enforces uniqueness on
the primary key, so the id is derived from the DID, hashed to keep it fixed length and URL safe,
which also lets the item be found from the DID with a single get.

#### Parameters

##### identity

`string`

The DID.

#### Returns

`string`

The unique identifier of the item.

***

### identityProofDocument() {#identityproofdocument}

> `static` **identityProofDocument**(`accountId`, `identity`, `nodeIdentity?`): `IJsonLdNodeObject`

Build the document an identity signs to prove it may be adopted by an account. The proof should
be made with a verification method listed under the DID's authentication relationship, with the
proof purpose authentication, and created just before it is sent as it is only accepted briefly.

#### Parameters

##### accountId

`string`

The account adopting the identity.

##### identity

`string`

The DID being adopted.

##### nodeIdentity?

`string`

The DID of the node the account is on, binds the proof to that node.

#### Returns

`IJsonLdNodeObject`

The document to create the proof for.

***

### organizationProofDocument() {#organizationproofdocument}

> `static` **organizationProofDocument**(`identity`, `nodeIdentity?`): `IJsonLdNodeObject`

Build the document an identity signs to prove it may be registered as an organization on a node.

#### Parameters

##### identity

`string`

The DID of the organization.

##### nodeIdentity?

`string`

The DID of the node the organization is registered on.

#### Returns

`IJsonLdNodeObject`

The document to create the proof for.

***

### markReadOnly() {#markreadonly}

> `static` **markReadOnly**\<`T`\>(`data`): `T`

Mark account data as read only, so the account may not change it.

#### Type Parameters

##### T {#t}

`T` *extends* `object`

#### Parameters

##### data

`T`

The object to mark.

#### Returns

`T`

A copy of the object with the read only property set.

***

### isReadOnly() {#isreadonly}

> `static` **isReadOnly**(`data`): `boolean`

Check whether account data is read only.

#### Parameters

##### data

`unknown`

The value of the account data.

#### Returns

`boolean`

True when the value is an object with the read only property set to true.
