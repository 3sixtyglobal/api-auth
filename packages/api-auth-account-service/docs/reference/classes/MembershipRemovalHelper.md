# Class: MembershipRemovalHelper

Helper class for removing an account from its organizations, which also ends its org admin role
of each organization.

## Constructors

### Constructor

> **new MembershipRemovalHelper**(): `MembershipRemovalHelper`

#### Returns

`MembershipRemovalHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### leave() {#leave}

> `static` **leave**(`storage`, `identityComponent`, `adminRoles`, `accountId`, `organization`, `preloaded?`): `Promise`\<`boolean`\>

Remove an account from an organization, removing its organization items and the membership
credentials the organization issued it. Only a credential that verifies in full, is issued by
the organization and names the identity of the account as a member counts as a membership
credential, other credentials the account stored are left. Only the revocation indexes the node
recorded when it issued the credentials of the organization items are revoked, never an index
read from a stored credential. The org admin role of the organization is removed.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### identityComponent

`IIdentityComponent`

The identity component that verifies and revokes credentials.

##### adminRoles

[`OrganizationAdminRoles`](OrganizationAdminRoles.md)

The org admin roles.

##### accountId

`string`

The account id.

##### organization

`string`

The DID of the organization.

##### preloaded?

The account data and node the caller has already read, read here when omitted.

###### identity?

`string`

The DID of the account.

###### organizations

`IAuthenticationAccountData`\<`unknown`\>[]

The organization items of the account.

###### credentials

`IAuthenticationAccountData`\<`unknown`\>[]

The credential items of the account.

###### nodeIdentity?

`string`

The DID of the node, which signs the revocation.

#### Returns

`Promise`\<`boolean`\>

True when the account held an organization item or membership credential for the organization.

***

### removeAll() {#removeall}

> `static` **removeAll**(`storage`, `requestStorage`, `identityComponent`, `adminRoles`, `accountId`): `Promise`\<`void`\>

Remove an account from every organization, revoking the membership credentials the node
issued, then remove its credentials, organizations and identity items, and its pending
requests to join an organization. The keys of the identity are not removed here.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### requestStorage

`IEntityStorageConnector`\<[`OrganizationRequest`](OrganizationRequest.md)\>

The entity storage for the requests to join an organization.

##### identityComponent

`IIdentityComponent`

The identity component that verifies and revokes credentials.

##### adminRoles

[`OrganizationAdminRoles`](OrganizationAdminRoles.md)

The org admin roles.

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the items have been removed.

***

### loadCredentialItems() {#loadcredentialitems}

> `static` **loadCredentialItems**(`storage`, `accountId`): `Promise`\<`IAuthenticationAccountData`\<`unknown`\>[]\>

Read every credential item of an account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`IAuthenticationAccountData`\<`unknown`\>[]\>

The credential items.
