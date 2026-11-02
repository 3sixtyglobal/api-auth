# Class: AccountHelper

Helper class for finding and removing accounts.

## Constructors

### Constructor

> **new AccountHelper**(): `AccountHelper`

#### Returns

`AccountHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### findByProviderAccount() {#findbyprovideraccount}

> `static` **findByProviderAccount**(`userEntityStorage`, `authProviderId`, `providerAccountId`): `Promise`\<[`AuthenticationUser`](AuthenticationUser.md) \| `undefined`\>

Find the account a provider identifies.

#### Parameters

##### userEntityStorage

`IEntityStorageConnector`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The entity storage for users.

##### authProviderId

`string`

The authentication provider id.

##### providerAccountId

`string`

The account identifier issued by the provider.

#### Returns

`Promise`\<[`AuthenticationUser`](AuthenticationUser.md) \| `undefined`\>

The account, or undefined when there is none.

***

### findByEmail() {#findbyemail}

> `static` **findByEmail**(`userEntityStorage`, `authProviderId`, `email`): `Promise`\<[`AuthenticationUser`](AuthenticationUser.md) \| `undefined`\>

Find the account a provider holds for an e-mail address. The normalised address is matched
first, then the address as given, so accounts stored before addresses were normalised are found.

#### Parameters

##### userEntityStorage

`IEntityStorageConnector`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The entity storage for users.

##### authProviderId

`string`

The authentication provider id.

##### email

`string`

The e-mail address of the account.

#### Returns

`Promise`\<[`AuthenticationUser`](AuthenticationUser.md) \| `undefined`\>

The account, or undefined when there is none.

***

### isDisabled() {#isdisabled}

> `static` **isDisabled**(`user`): `boolean`

Check whether an account is disabled, accounts stored before the flag existed use the date.

#### Parameters

##### user

[`AuthenticationUser`](AuthenticationUser.md)

The account.

#### Returns

`boolean`

True when the account is disabled.

***

### canSignIn() {#cansignin}

> `static` **canSignIn**(`user`): `boolean`

Check whether an account may sign in, it must be enabled and verified, accounts without the
verified flag are verified.

#### Parameters

##### user

[`AuthenticationUser`](AuthenticationUser.md)

The account.

#### Returns

`boolean`

True when the account may sign in.

***

### findAllByEmail() {#findallbyemail}

> `static` **findAllByEmail**(`userEntityStorage`, `email`, `limit`): `Promise`\<[`AuthenticationUser`](AuthenticationUser.md)[]\>

Find the accounts of any provider for an e-mail address.

#### Parameters

##### userEntityStorage

`IEntityStorageConnector`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The entity storage for users.

##### email

`string`

The e-mail address of the accounts.

##### limit

`number`

The maximum number of accounts to return.

#### Returns

`Promise`\<[`AuthenticationUser`](AuthenticationUser.md)[]\>

The accounts.

***

### update() {#update}

> `static` **update**(`userEntityStorage`, `user`, `change`): `Promise`\<[`AuthenticationUser`](AuthenticationUser.md) \| `undefined`\>

Write a change to an account. The last write wins until the storage locks writes optimistically.

#### Parameters

##### userEntityStorage

`IEntityStorageConnector`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The entity storage for users.

##### user

[`AuthenticationUser`](AuthenticationUser.md)

The account as read.

##### change

(`current`) => [`AuthenticationUser`](AuthenticationUser.md) \| `Promise`\<[`AuthenticationUser`](AuthenticationUser.md) \| `undefined`\> \| `undefined`

Make the change to an account, or return undefined when there is nothing to change.

#### Returns

`Promise`\<[`AuthenticationUser`](AuthenticationUser.md) \| `undefined`\>

The account as written, or undefined when there was nothing to change.

***

### disable() {#disable}

> `static` **disable**(`userEntityStorage`, `user`): `Promise`\<[`AuthenticationUser`](AuthenticationUser.md) \| `undefined`\>

Disable an account and move its password version on, so its tokens stop working, and clear its
tokens from the token caches of this process. An account already disabled is left as it is.

#### Parameters

##### userEntityStorage

`IEntityStorageConnector`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The entity storage for users.

##### user

[`AuthenticationUser`](AuthenticationUser.md)

The account as read.

#### Returns

`Promise`\<[`AuthenticationUser`](AuthenticationUser.md) \| `undefined`\>

The account as written, or undefined when it was already disabled.

***

### removeAccount() {#removeaccount}

> `static` **removeAccount**(`userEntityStorage`, `passwordResetEntityStorage`, `accountAdmin`, `organizationRequestAdmin`, `accountId`, `authorization`): `Promise`\<`void`\>

Remove an account and the data stored for it: its password reset and verification tokens, its
requests to join an organization, its account data and its roles. The account is disabled first, so its sessions end and a
concurrent sign in cannot write it again, and it is removed last. The caller must already have
been checked, the data is removed without the user.

#### Parameters

##### userEntityStorage

`IEntityStorageConnector`\<[`AuthenticationUser`](AuthenticationUser.md)\>

The entity storage for users.

##### passwordResetEntityStorage

`IEntityStorageConnector`\<[`AuthenticationPasswordReset`](AuthenticationPasswordReset.md)\>

The entity storage for password reset tokens.

##### accountAdmin

`IAuthenticationAccountAdminComponent`

The account data admin component.

##### organizationRequestAdmin

`IOrganizationRequestAdminComponent`

The organization request admin component.

##### accountId

`string`

The account id.

##### authorization

The authorization component and model that hold the roles of the account.

###### component

`IAuthorizationComponent`

The authorization component.

###### modelId

`string`

The authorization model ID the roles are held in.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has been removed.

***

### lockKey() {#lockkey}

> `static` **lockKey**(`key`): `Promise`\<`string`\>

Get the key of a lock in the current tenant.

#### Parameters

##### key

`string`

The key, such as the e-mail address of a sign up.

#### Returns

`Promise`\<`string`\>

The lock key.

***

### runWithoutUser() {#runwithoutuser}

> `static` **runWithoutUser**\<`T`\>(`method`): `Promise`\<`T`\>

Run a method without the caller's account, user and organization, once the caller has been checked.

#### Type Parameters

##### T {#t}

`T`

#### Parameters

##### method

() => `Promise`\<`T`\>

The method to run.

#### Returns

`Promise`\<`T`\>

The result of the method.
