# Class: PendingMembershipHelper

Helper class for adding accounts to organizations before they have an identity, the membership
credential is issued when the identity is bound.

## Constructors

### Constructor

> **new PendingMembershipHelper**(): `PendingMembershipHelper`

#### Returns

`PendingMembershipHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### add() {#add}

> `static` **add**(`storage`, `organizationStorage`, `identityComponent`, `verificationMethodId`, `accountId`, `organization`, `isDefault?`): `Promise`\<`string`\>

Add an account to an organization, issuing the membership credential now when the account has
an identity, otherwise storing only the organization.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### organizationStorage

`IEntityStorageConnector`\<[`Organization`](Organization.md)\>

The entity storage for the registered organizations.

##### identityComponent

`IIdentityComponent`

The identity component that issues the credential.

##### verificationMethodId

`string`

The verification method of the organization that signs the credential.

##### accountId

`string`

The account to add.

##### organization

`string`

The DID of the organization.

##### isDefault?

`boolean`

True to make it the default organization of the account.

#### Returns

`Promise`\<`string`\>

The unique identifier of the organization item.

***

### complete() {#complete}

> `static` **complete**(`storage`, `organizationStorage`, `identityComponent`, `verificationMethodId`, `accountId`, `identity?`, `options?`): `Promise`\<`string`[]\>

Issue the membership credentials of the organizations an account was added to before it had
an identity. A failure for one organization does not stop the others, its membership stays
without a credential, so it is completed again the next time, and the failure is logged.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### organizationStorage

`IEntityStorageConnector`\<[`Organization`](Organization.md)\>

The entity storage for the registered organizations.

##### identityComponent

`IIdentityComponent`

The identity component that issues the credentials.

##### verificationMethodId

`string`

The verification method of the organization that signs the credential.

##### accountId

`string`

The account id.

##### identity?

`string`

The DID just bound to the account, read when omitted.

##### options?

The optional settings.

###### logging?

`ILoggingComponent`

The logging component that records a failure, when it exists.

#### Returns

`Promise`\<`string`[]\>

The organizations whose credential could not be issued.
