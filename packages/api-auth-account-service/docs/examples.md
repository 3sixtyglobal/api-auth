# API Auth Account Service Examples

Store data such as the profile, identity, organization and verifiable credentials against an account, and set the identity and organization on each request.

## EntityStorageAuthenticationAccountService

The service works on the data of the signed in account, taken from the request context. The account cannot set its own identity or organization, these are only set through `adoptIdentity`, `joinOrganization` or the admin service. Verifiable credential items, `vc`, are written by the node when it issues a membership credential, the account can also store, change and remove its own, membership is only recognised from credentials that verify.

Types are compared exactly. A type that differs from a known type, such as `identity`, `organization`, `vc`, `profile`, `publicData` or `migration`, only by case or surrounding whitespace is refused with an `UnprocessableError`, reserved types are matched ignoring case, and results are filtered again in code, so storage that compares without case cannot return or clear the items of another type.

```typescript
import { AuthenticationAccountDataType } from '@3sixty/api-auth-models';
import { EntityStorageAuthenticationAccountService } from '@3sixty/api-auth-account-service';

const accountService = new EntityStorageAuthenticationAccountService();

await accountService.create(AuthenticationAccountDataType.Profile, {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Alice'
});

// Choose what is public, a path names a type and optionally a nested property.
await accountService.create(AuthenticationAccountDataType.PublicData, {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: ['profile.name']
});

// Any caller reads the public data by DID, a signed in account also by account or organization id.
const published = await accountService.getPublicDataByIdentity('did:example:alice');

// Any other type can be stored, one row per item.
await accountService.create('address', { postalCode: 'AB1 2CD' });

// Each credential issued by the node is its own item.
const credentials = await accountService.query(AuthenticationAccountDataType.VerifiableCredential);
```

Admins can store items only admins may see and change, `adminOnly`. The account never sees them, `get`, `update` and `remove` report them as missing, `query` and `exportProfile` leave them out, an import neither removes nor replaces them, and creating an item of a type it holds as admin only is refused with a `ConflictError`, `accountDataAdminOnly`. They are never published.

An account with an identity and no organization or pending request can create an organization with `createOrganization`. The node creates and holds its DID, the account becomes its member with a membership credential issued by the organization, and holds its org admin role, `org-admin:` followed by the DID by default, `organizationAdminRolePrefix` in the configuration. An organization identity export may be given as `identityImport`, as an admin may when creating one, so an organization moved from another node keeps its DID: the file's type is checked first, the node then imports and holds the keys, and the revocation index carries on from the export or the highest index the DID reached here. A DID already registered answers `organizationExists`, one held by an account or the node `organizationIdentityInUse`, one whose keys the node already holds `identityImportConflict`, and a file whose keys do not match `identityExportInvalid`.

An account may store at most `maxItems` items itself, 1000 by default, and at most the number in `maxItemsByType` of a type, `{ vc: 200 }` by default, merged with what is configured. A create beyond either is refused with an `UnprocessableError`, `accountDataLimitReached` or `accountDataTypeLimitReached`. The items the node stores, such as the identity, organizations and imported credentials, count towards the limits but are never refused. Concurrent creates can go slightly over a limit. The node migration records are not listed by `query` or returned by `get` of the account itself.

An account has one identity. Adopt a new self-controlled DID, or a DID the caller already owns by including a proof over the identity proof document. The document binds the DID to the account and to the node, the `Node` context id. The proof may use any verification method of the DID and any proof purpose, and must have been created within `identityProofMaxAgeSeconds`, 5 minutes by default. A proof over the document without the node, as made by earlier clients, is also accepted. There is no server issued challenge, so the short window, the node binding and a DID only being held by one account limit replay. A DID held by another account, the node identity, the organization of the tenant or node, or a registered organization cannot be adopted. Adopting needs a recent sign in, as exporting does, see [Moving an Identity](#moving-an-identity). Adoptions are rate limited per account with the `adopt-identity` action when an authentication rate component exists, and serialised per account and per DID, so two accounts cannot bind the same DID at once. Over REST, `POST /authentication/account/identity` needs a JSON body, `{}` creates a self-controlled DID.

The membership credentials of the organizations the account was added to before it had an identity are issued once it has one. A credential that cannot be issued, such as when the node no longer holds the keys of the organization, does not fail the adoption, the membership is kept without a credential, issued again the next time, and the failure is logged through the logging component when one exists.

```typescript
import { AuthenticationAccountHelper } from '@3sixty/api-auth-models';
import { ProofHelper } from '@3sixty/standards-w3c-did';

const sessionStart = Math.floor(Date.now() / 1000); // from the token of the request

// Create a new self-controlled DID for the account.
const did = await accountService.adoptIdentity(undefined, undefined, sessionStart);

// Or adopt an existing DID, signing the document that binds it to this account on this node with a
// verification method of the DID.
const document = AuthenticationAccountHelper.identityProofDocument(
  accountId,
  'did:example:alice',
  nodeIdentity
);
const unsignedProof = ProofHelper.createUnsignedProof(
  'DataIntegrityProof',
  'did:example:alice#auth-1',
  {
    proofPurpose: 'authentication'
  }
);
const proof = await signProof(document, unsignedProof); // signed with the key of did:example:alice#auth-1
await accountService.adoptIdentity('did:example:alice', proof, sessionStart);
```

Profiles stored from an authentication provider are marked with `readonlyValue: true`. The account cannot update or remove them, add a profile of the same type, or make another profile of the type the default, while the default one is read only.

An account signed in with a password uploads its own avatar, one `avatar` item, the default, created when it has none and updated otherwise. An account holds one avatar, so creating one, by the account or an admin, replaces the avatar it has, which stays the default. The browser crops and resizes the picture to a 512 by 512 JPEG before sending it. Every write of an avatar, by the account, an admin or a profile import, must be a schema.org `ImageObject` with `encodingFormat` `image/jpeg`, a `contentUrl` that is a `data:image/jpeg;base64,` URL with valid base64, and an optional `width` and `height` from 1 to 1024, otherwise it fails with `avatarInvalid`. More than 256 KiB of decoded image fails with `avatarTooLarge`, with `maxBytes` in its properties. Both are 422 errors.

```typescript
const avatarId = await accountService.create(
  'avatar',
  {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    encodingFormat: 'image/jpeg',
    contentUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
    width: '512',
    height: '512'
  },
  true
);
```

The avatar of an account signed in with Google or Microsoft is the photo the provider holds, stored at each sign in marked read only, so like a provider profile the account cannot replace or remove it, and an admin cannot replace, change or remove it either, `readOnly` with a 403. Only a system call, such as the authentication service at sign in, changes it. A provider avatar keeps the content type of the photo, JPEG, PNG or WebP, and may be up to 1 MiB.

An account with an identity asks to join an organization, or several, one request pending to each at a time, and an admin of each accepts or rejects it. `getOrganization` returns the organization once joined, nothing while the request is pending, and throws with the reason when it was rejected.

```typescript
await accountService.joinOrganization('did:example:org');

await accountService.joinOrganization('did:example:other-org');

// The latest request to each organization, with its status and any rejection reason.
const requests = await accountService.getOrganizationRequests();
console.log(requests.map(request => request.status)); // ['pending', 'pending']

// Cancel the pending request to an organization.
await accountService.cancelOrganizationRequest('did:example:other-org');

try {
  const organization = await accountService.getOrganization();
  console.log(organization ?? 'pending');
} catch (error) {
  // UnprocessableError with the organization and the i18n key of the reason in its properties.
  console.log(error);
}
```

### Moving an Identity

An account can export its identity, with the private keys the node holds for it and the credentials it holds, and import it into an account on this or another node. Adopting, exporting, importing and removing the identity need a recent sign in: the session must have started within `recentSignInSeconds`, 300 by default, and not more than a minute in the future, so a start in milliseconds is refused, otherwise an `UnauthorizedError` with the key `recentSignInHelper.recentSignInRequired` asks the caller to sign in again. The routes pass the session start the auth header processor read from the token, refreshing a token keeps it. Only an identity whose keys the node holds, such as one created by `adoptIdentity()`, can be exported, otherwise `identityKeysNotHeld` is thrown. The export is plain JSON holding private keys, the routes send it with `cache-control: no-store`, so keep it safe.

Importing is an alternative to `adoptIdentity`, for an account without an identity. The identity must be self-controlled and not held by an account, the node or an organization, a DID the node already holds is refused with a `ConflictError`, `identityImportConflict`. The credentials of the export are JSON credential objects, each is verified in full and kept when it is issued to the identity and not revoked, the others, including any value that is not a JSON credential such as a JWT, are counted as skipped. The account becomes a member of each registered organization whose membership credential it holds, with no role, an import never makes the account an organization admin. Only a membership credential that carries a revocation status the node can check restores the membership, its index is recorded so leaving revokes it. A credential without a status, such as one issued before membership credentials were revocable or by an organization that is not registered, is kept as a credential only, as ending the membership could not revoke it. When binding the identity fails, the items the import created that still belong to the account are removed and the identity is removed from the node again, each step on its own, and the original error is thrown.

Removing the identity also removes its credentials, organizations and pending requests to join one, revoking the membership credentials the node issued, so importing the export again does not restore the memberships. The keys the node holds are removed with a document stored on the node, a document published on a ledger, such as IOTA, is kept so the export can be imported again. An identity adopted with a proof, whose keys the node does not hold, is only unbound. Export and import are rate limited per account with the `export-identity` and `import-identity` actions.

```typescript
const sessionStart = Math.floor(Date.now() / 1000); // from the token of the request

const exported = await accountService.exportIdentity(sessionStart);

// On another node, where nothing was revoked.
const result = await accountService.importIdentity(exported, sessionStart);
console.log(result.credentialsImported, result.credentialsSkipped, result.organizations);
```

Leaving an organization removes its organization items and the membership credentials it issued to the account. Only a credential that verifies in full, is issued by the organization and names the identity of the account as a member counts, other credentials the account stored are left. The revocation index the node recorded when it issued the membership credential is revoked, never an index read from a stored credential, and leaving does not fail when it cannot be revoked. Membership grants no role, the member admin role given to the creator of an organization applies to every organization of the tenant, so leaving removes no role. Requests to join are kept.

```typescript
await accountService.leaveOrganization('did:example:org');
```

### Moving the Account Data

The account data other than the identity, organizations, credentials and node migration records can be exported, and an export replaces it. The items are created first and only then are the existing items of those types removed, so a failure keeps the existing data. The first default of each type and the order of the items are kept. A type of which the account holds a profile or avatar owned by its authentication provider is left as it is, and read only items in the export are left out, both reported in `skippedTypes`. An export is refused when its version is not 1, it holds an excluded type, more than `profileImportMaxItems` items, 1000 by default, or more than `profileImportMaxBytes` of items as JSON, 1 MiB by default. An uploaded avatar is exported and imported like the other items, and is checked as when it is stored before anything is replaced. Both are rate limited per account with the `export-profile` and `import-profile` actions.

```typescript
const profile = await accountService.exportProfile();
const replaced = await accountService.importProfile(profile);
console.log(replaced.itemsImported, replaced.itemsRemoved, replaced.skippedTypes);
```

## EntityStorageAuthenticationAccountAdminService

The admin service works on the data of any account of the tenant, admins are not limited to an organization. Callers without the escalated privilege role, `global-admin` by default, must include a proof of ownership when binding an identity, and cannot change the identity or organization of their own account. Calls with no caller account, such as from the node CLI, are system calls and are not limited. Organizations can only be added when registered, and the identity rules of `adoptIdentity` also apply to binding an identity. The account data of a registered organization, whose account id is its DID, is changed through the organization service, so the admin item writes, identity and profile exports and imports refuse it with `organizationProfileManaged`, a 422.

```typescript
import { AuthenticationAccountHelper } from '@3sixty/api-auth-models';
import { EntityStorageAuthenticationAccountAdminService } from '@3sixty/api-auth-account-service';

const adminService = new EntityStorageAuthenticationAccountAdminService();

const accountId = '01a17afb-e05f-7939-83f2-d4f04c4bdf2e';

// An account can belong to several organizations, the default is the one used first. The membership
// credential is issued now when the account has an identity, otherwise when it binds one.
const organization = AuthenticationAccountHelper.createOrganizationData('did:example:org-1');
const id = await adminService.create(accountId, 'organization', organization);
await adminService.create(
  accountId,
  'organization',
  AuthenticationAccountHelper.createOrganizationData('did:example:org-2'),
  true
);

// Setting another default clears the previous one, the organization itself cannot be changed.
await adminService.update(id, organization, true);

const items = await adminService.query(accountId, 'organization');
console.log(items.entities.length); // 2

// An account holds one identity and a DID is held by one account, to change it remove it and store another.
// Callers without escalated privilege include a recent proof over the identity proof document.
// A type differing from a known type only by case, such as 'Identity', is refused.
// A raw DID string is refused, the value is a JSON-LD object.
await adminService.create(
  accountId,
  'identity',
  AuthenticationAccountHelper.createIdentityData('did:example:alice'),
  undefined,
  proof
);
```

Roles are held by account ids. Only callers holding the escalated privilege role, `global-admin` by default, can change the identity or organization of an account that holds that role.

Removing an organization item removes the account from the organization as leaving does, revoking the membership credential the node issued. Removing an identity item removes it as `removeIdentity` does, with the keys the node holds for it, the credentials, organizations and, when the `organization-request` storage exists, the pending requests to join one.

## EntityStorageOrganizationRequestAdminService

The organization request admin service reviews the requests to join any organization of the tenant. Only callers holding the escalated privilege role accept, or remove the requests of, an account holding it. Accepting a request issues a membership credential signed by the organization, with the `trust-assertion` verification method by default and a revocation index from the organization, then stores the organization and the JSON credential, with its embedded proof, as account data of the account.

```typescript
import { EntityStorageOrganizationRequestAdminService } from '@3sixty/api-auth-account-service';

const requestAdmin = new EntityStorageOrganizationRequestAdminService({
  config: { verificationMethodId: 'trust-assertion' }
});

const pending = await requestAdmin.query('pending', 'did:example:org');

await requestAdmin.accept(pending.entities[0].id);
// The reason is an i18n key the client translates for the account.
// An account can also be added directly, without a request, as the node CLI does.
await OrganizationMembershipHelper.join(
  accountDataStorage,
  identityComponent,
  'trust-assertion',
  accountId,
  'did:example:org'
);
await requestAdmin.reject(pending.entities[1].id, 'organizationRequest.reason.notAMember');
```

### Roles

The account admin service also manages the roles of the accounts. A caller holding escalated privilege grants and revokes any role on any account, including `global-admin`, and may always grant the roles in `assignableRoles`, `user-admin` by default, and `tenant-admin` when the node enables tenants, even before any account holds them. Revoking `global-admin` from its last holder is refused with a `ConflictError`. A scoped user-admin only changes the accounts it manages, never its own and never one holding escalated privilege, and only with the roles it holds other than `global-admin`, so it can make another member a user-admin. The org admin roles are refused with an `UnprocessableError`, they are managed through the organization. The authorization component is called in the context of the caller, so its own escalation checks also apply.

```typescript
const assignable = await adminService.getAssignableRoles();
await adminService.addRole(accountId, 'user-admin');
const roles = await adminService.getRoles(accountId);
await adminService.removeRole(accountId, 'user-admin');
```

## EntityStorageOrganizationService

The organization service registers organizations on the node, inside the partition of the caller's tenant. An organization has an internal id and a DID held by no other organization, and its profile, logo and public data are account data owned by its DID. Callers holding the escalated privilege role manage every organization of the tenant. The org admins of an organization, who hold `org-admin:` followed by its DID, change its profile, logo and public data, list its members, grant and revoke org admin, an org admin cannot revoke the last one, and remove it when they are its only member. Callers holding the member admin role, `user-admin` by default, also create organizations and list, export and remove those they are an org admin of, and manage the organization of the tenant. Members and admins read the profile, logo and public data paths, any other signed in account reads the public data, `public`, and a search returns the public data with the name. The name of the profile is also stored in lower case on the organization, so a search matches the start of the name without case. The account data admin service refuses to change the items of a registered organization. The signed in caller is always the first member and its org admin, an account named in the request is ignored, and the organization becomes its default when it has none. A system call, such as from the node CLI, has no account, so the organization is created without members. Ending a membership removes the org admin role of that organization, and removing an organization removes it from every account. Being made an org admin, on creating an organization or by a grant, also gives the account the member admin role, and taking its last org admin role, however it is taken, takes the member admin role too, while an org admin of another organization keeps it. The last org admin of an organization cannot leave it, `leaveOrganization` answers `organizationLastAdmin`, so another member is made an org admin first, or the organization is removed by its only member.

An existing DID registered as an organization must not be held by an account, and callers other than system calls include a recent proof by the DID over the organization proof document, with the same rules as an identity proof.

```typescript
import { EntityStorageOrganizationService } from '@3sixty/api-auth-account-service';

const organizationService = new EntityStorageOrganizationService({
  config: { verificationMethodId: 'trust-assertion', memberAdminRole: 'user-admin' }
});

// Without a DID, a DID controlled by the node is created with the trust-assertion verification
// method. The caller joins the organization as its first member and org admin.
const organization = await organizationService.create({
  profile: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Example Ltd' },
  publicData: ['profile.name']
});

// Change the logo and what is public.
await organizationService.update(organization.id, {
  logo: {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    encodingFormat: 'image/png',
    contentUrl: 'data:image/png;base64,iVBORw0KGgo='
  },
  publicData: ['profile.name', 'logo']
});

// List the members, make one an org admin.
const members = await organizationService.queryMembers(organization.id);
await organizationService.addAdmin(organization.id, members.entities[0].accountId);

// An existing DID can be registered instead, with a proof by it over the organization proof document.
const document = AuthenticationAccountHelper.organizationProofDocument(
  'did:example:partner',
  nodeIdentity
);
const proof = await signProof(
  document,
  ProofHelper.createUnsignedProof('DataIntegrityProof', 'did:example:partner#auth-1', {
    proofPurpose: 'authentication'
  })
);
await organizationService.create({ identity: 'did:example:partner', proof });

// Read by the internal id or by the DID.
const byDid = await organizationService.get(organization.identity);

// Find the organizations whose name starts with the text, without case, with their public data.
const found = await organizationService.search('exam', 10);

// An organization is only removed once it has no members, or by its org admin as its only member.
await organizationService.remove('did:example:partner');
```

When creating an organization fails, after its DID was created or imported, after it was registered or after its first member was added, what was done is undone, each step on its own with a failure logged, and the original error is thrown. Removing an organization whose DID the node created or imported also removes its keys, first, so a failure keeps the organization. A DID registered as an existing identity is left, as the node does not hold it, and so are the organizations registered before the node recorded which DIDs it holds.

An admin can export the identity of an organization whose keys the node holds, with a recent sign in and rate limited with the `export-organization-identity` action, and create an organization from an export instead of naming or creating a DID. The DID of the node and of the organization of the tenant are never exported, even when registered, a `ForbiddenError`, `nodeIdentityExportNotPermitted`, and cannot be imported as an organization. The export is imported controlled by the node and registered as `create` does, with the caller as the first member. It cannot be given with `identity` or `proof`, a DID the node already holds is refused with a `ConflictError`, `identityImportConflict`, and it is removed from the node again when registering fails.

```typescript
const exported = await organizationService.exportIdentity(organization.id, sessionStart);

// On another node, or after the organization was removed from this one.
await organizationService.create({ identityImport: exported, profile });
```

When the organization storage is configured, accounts can only ask to join, be added to, or be accepted into registered organizations, and the organization of the tenant, or of the node when single tenant, is always accepted.

## AuthenticationAccountProcessor

Run the processor after the auth header processor and before authorization. It reads the identity and organization of the signed in account, keeps them in a cache, and sets the user and user organization context ids. For each it uses the item marked as the default, otherwise the earliest created.

```typescript
import { AuthenticationAccountProcessor } from '@3sixty/api-auth-account-service';

const processor = new AuthenticationAccountProcessor({
  config: {
    cacheTtlMs: 30000,
    noIdentityCacheTtlMs: 5000,
    cacheCapacity: 1000
  }
});
```

A change to the identity or organization made through the services or `AccountDataHelper` clears the cached entry of the account in the same process, through `AccountContextCache`, including a load in progress, which is then not cached. Concurrent requests for an account share one load. Other processes, such as other instances behind a load balancer, keep their entry until it expires after `cacheTtlMs`, so keep it short where several instances run. An account without an identity is only kept for `noIdentityCacheTtlMs`, so another process uses an identity it adopts within that time, while a stale entry only withholds the identity.

```typescript
import { AccountContextCache } from '@3sixty/api-auth-account-service';

// Clear an account of the current tenant after changing its account data directly.
await AccountContextCache.invalidate(accountId);
```

## Membership Credentials

`OrganizationMembershipHelper.hasCredential` only recognises a membership credential that verifies with the identity component: it must not be revoked, its issuer must be the organization, and a subject must have the identity of the account as its id and the organization in `memberOf`. Others are ignored, so joining issues a new credential in their place. Credentials are stored as JSON credential objects with an embedded proof, and verified as objects. The issuer of each is read without verifying, and only those claiming the organization as their issuer are verified. Credentials issued by the node before are recognised as they meet these rules.

A registered organization gives each membership credential it issues its own revocation index, from a counter held with the organization. Writes to an organization are serialised in the process, otherwise the last write wins. The index is recorded with the organization item of the account, never returned with it, so the credential is revoked when the account leaves, an admin removes the organization item, or the identity is removed. An organization that is not registered, such as the organization of the tenant when the node has not registered it, has no counter, so its credentials are issued without a revocation index. Credentials issued before the counter existed have no index and cannot be revoked.

The organization items keep their DID in the indexed `organization` column, used to find the members of an organization. Items written before the column existed have no value in it, and no data from before the column was added exists, so there is no backfill. Should such items exist, update each organization item once, which writes the column.

## Identity Profile Routes

The identity profile routes are replaced by the account routes. `generateRestRoutesIdentityProfileDeprecated` keeps the same methods and paths, mounted at `/identity/profile`, and every route returns a `NotSupportedError` pointing at `/authentication/account`.

```typescript
import { generateRestRoutesIdentityProfileDeprecated } from '@3sixty/api-auth-account-service';

const routes = generateRestRoutesIdentityProfileDeprecated('identity/profile', 'identityProfile');
console.log(routes.length); // 10
```
