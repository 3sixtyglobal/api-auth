# Class: OrganizationAdminRoles

The org admin roles of the organizations, a role per organization, its prefix followed by the DID
of the organization, held by account ids. Making an account an org admin also gives it the member
admin role, for the accounts of the organization, and taking its last org admin role takes that
role too. The services check the caller before changing a role, so the roles are changed as a
system call.

## Constructors

### Constructor

> **new OrganizationAdminRoles**(`authorizationComponent`, `authorizationModelId`, `rolePrefix?`, `memberAdminRole?`): `OrganizationAdminRoles`

Create a new instance of OrganizationAdminRoles.

#### Parameters

##### authorizationComponent

`IAuthorizationComponent`

The authorization component that holds the roles.

##### authorizationModelId

`string`

The authorization model ID the roles are held in.

##### rolePrefix?

`string`

The prefix of the roles, the default when omitted.

##### memberAdminRole?

`string`

The role given with an org admin role, the default when omitted.

#### Returns

`OrganizationAdminRoles`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_ROLE\_PREFIX {#default_role_prefix}

> `readonly` `static` **DEFAULT\_ROLE\_PREFIX**: `string` = `OrganizationRolePrefix.Admin`

The default prefix of the org admin roles.

***

### DEFAULT\_MEMBER\_ADMIN\_ROLE {#default_member_admin_role}

> `readonly` `static` **DEFAULT\_MEMBER\_ADMIN\_ROLE**: `string` = `"user-admin"`

The default role given with an org admin role.

## Methods

### role() {#role}

> **role**(`organization`): `string`

Get the org admin role of an organization.

#### Parameters

##### organization

`string`

The DID of the organization.

#### Returns

`string`

The role.

***

### isRole() {#isrole}

> **isRole**(`role`): `boolean`

Check whether a role is an org admin role.

#### Parameters

##### role

`string`

The role.

#### Returns

`boolean`

True when it is.

***

### isAdmin() {#isadmin}

> **isAdmin**(`accountId`, `organization`): `Promise`\<`boolean`\>

Check whether an account is an org admin of an organization.

#### Parameters

##### accountId

`string` \| `undefined`

The account id, false when omitted.

##### organization

`string`

The DID of the organization.

#### Returns

`Promise`\<`boolean`\>

True when it is.

***

### organizations() {#organizations}

> **organizations**(`accountId`): `Promise`\<`string`[]\>

Get the organizations an account is an org admin of.

#### Parameters

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`string`[]\>

The DIDs of the organizations.

***

### admins() {#admins}

> **admins**(`organization`): `Promise`\<`string`[]\>

Get the org admins of an organization.

#### Parameters

##### organization

`string`

The DID of the organization.

#### Returns

`Promise`\<`string`[]\>

The account ids.

***

### add() {#add}

> **add**(`accountId`, `organization`): `Promise`\<`void`\>

Make an account an org admin of an organization, giving it the member admin role as well.

#### Parameters

##### accountId

`string`

The account id.

##### organization

`string`

The DID of the organization.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the roles have been given.

***

### remove() {#remove}

> **remove**(`accountId`, `organization`): `Promise`\<`void`\>

Stop an account being an org admin of an organization, when it is one, taking the member admin
role as well when it is an org admin of no other organization.

#### Parameters

##### accountId

`string`

The account id.

##### organization

`string`

The DID of the organization.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the roles have been removed.

***

### removeAll() {#removeall}

> **removeAll**(`organization`): `Promise`\<`void`\>

Remove the org admin role of an organization from every account that holds it.

#### Parameters

##### organization

`string`

The DID of the organization.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the roles have been removed.
