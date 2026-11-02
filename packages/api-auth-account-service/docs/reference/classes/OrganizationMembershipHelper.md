# Class: OrganizationMembershipHelper

Helper class for adding an account to an organization, used when a request is accepted and when
an account is added directly, such as by the node CLI.

## Constructors

### Constructor

> **new OrganizationMembershipHelper**(): `OrganizationMembershipHelper`

#### Returns

`OrganizationMembershipHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### CREDENTIAL\_TYPE {#credential_type}

> `readonly` `static` **CREDENTIAL\_TYPE**: `string` = `OrganizationCredentialType.Membership`

The type a membership credential carries after VerifiableCredential, so a holder can tell what
it is for. Credentials issued before it existed carry only VerifiableCredential, so a membership
is still recognised by its issuer and memberOf, never by this type.

## Methods

### join() {#join}

> `static` **join**(`accountDataStorage`, `organizationStorage`, `identityComponent`, `verificationMethodId`, `accountId`, `organization`, `isDefault?`, `preloaded?`): `Promise`\<`string`\>

Add an account to an organization, issuing a membership credential signed by the organization
and storing the organization and the JSON credential, with its proof, as account data. Each is
only written when missing, so a repeated call completes an interrupted one, and an existing organization is
otherwise left as it is, other than being made the default when asked. The credential of a
registered organization is given a revocation index from the counter of the organization, which
is recorded with the organization item so the credential is revoked when the membership ends.

#### Parameters

##### accountDataStorage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### organizationStorage

`IEntityStorageConnector`\<[`Organization`](Organization.md)\>

The entity storage for the registered organizations, which hold
the revocation index counters.

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

True to make it the default organization of the account, otherwise it is the
default only when it is the first.

##### preloaded?

The account data the caller has already read, read here when omitted.

###### identity?

`string`

The DID of the account.

###### organizations?

`IAuthenticationAccountData`\<`unknown`\>[]

The organization items of the account.

###### credentials?

`IDidVerifiableCredential`[]

The credentials of the account.

#### Returns

`Promise`\<`string`\>

The unique identifier of the organization item.

#### Throws

UnprocessableError when the account has no identity to issue the credential to.

***

### hasCredential() {#hascredential}

> `static` **hasCredential**(`accountDataStorage`, `identityComponent`, `accountId`, `organization`, `preloaded?`): `Promise`\<`boolean`\>

Check whether an account holds a valid membership credential for an organization. Each stored
credential that claims to be issued by the organization is verified, it must be signed by and
issued by the organization, not revoked, and name the identity of the account as a member,
others are ignored.

#### Parameters

##### accountDataStorage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### identityComponent

`IIdentityComponent`

The identity component that verifies the credentials.

##### accountId

`string`

The account id.

##### organization

`string`

The DID of the organization.

##### preloaded?

The account data the caller has already read, read here when omitted.

###### identity?

`string`

The DID of the account.

###### credentials?

`IDidVerifiableCredential`[]

The credentials of the account.

#### Returns

`Promise`\<`boolean`\>

True when the account holds a valid membership credential for the organization.

***

### loadIdentity() {#loadidentity}

> `static` **loadIdentity**(`accountDataStorage`, `accountId`): `Promise`\<`string` \| `undefined`\>

Read the DID of an account.

#### Parameters

##### accountDataStorage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`string` \| `undefined`\>

The DID, or undefined when the account has none.

***

### loadOrganizations() {#loadorganizations}

> `static` **loadOrganizations**(`accountDataStorage`, `accountId`): `Promise`\<`IAuthenticationAccountData`\<`unknown`\>[]\>

Read every organization item of an account.

#### Parameters

##### accountDataStorage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`IAuthenticationAccountData`\<`unknown`\>[]\>

The organization items.

***

### revokeIndex() {#revokeindex}

> `static` **revokeIndex**(`identityComponent`, `organization`, `revocationIndex`, `nodeIdentity?`): `Promise`\<`boolean`\>

Revoke a membership credential by the revocation index the node recorded when it issued it,
signing for the organization as the node.

#### Parameters

##### identityComponent

`IIdentityComponent`

The identity component.

##### organization

`string`

The DID of the organization.

##### revocationIndex

`number`

The recorded index.

##### nodeIdentity?

`string`

The DID of the node, read from the context when omitted.

#### Returns

`Promise`\<`boolean`\>

True when the credential was revoked.

***

### loadCredentials() {#loadcredentials}

> `static` **loadCredentials**(`accountDataStorage`, `accountId`): `Promise`\<`IDidVerifiableCredential`[]\>

Read the JSON credentials of an account, values that are not JSON credentials are ignored.

#### Parameters

##### accountDataStorage

`IEntityStorageConnector`\<[`AccountData`](AccountData.md)\>

The entity storage for account data.

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`IDidVerifiableCredential`[]\>

The credentials.

***

### claimsIssuer() {#claimsissuer}

> `static` **claimsIssuer**(`credential`, `organization`): `boolean`

Check whether a credential claims to be issued by an organization, without verifying it, so
only credentials that could count are verified.

#### Parameters

##### credential

`IDidVerifiableCredential`

The credential.

##### organization

`string`

The DID of the organization.

#### Returns

`boolean`

True when the unverified issuer is the organization.

***

### isValidMembership() {#isvalidmembership}

> `static` **isValidMembership**(`identityComponent`, `credential`, `organization`, `identity`): `Promise`\<`boolean`\>

Check whether a credential verifies and shows the identity is a member of an organization.

#### Parameters

##### identityComponent

`IIdentityComponent`

The identity component that verifies the credential.

##### credential

`IDidVerifiableCredential`

The credential.

##### organization

`string`

The DID of the organization.

##### identity

`string`

The DID of the account.

#### Returns

`Promise`\<`boolean`\>

True when the credential is valid membership of the organization for the identity.
