# API Auth Account Rest Client Examples

Use these clients to manage account data from browser or server-side TypeScript applications.

## EntityStorageAuthenticationAccountRestClient

```typescript
import { EntityStorageAuthenticationAccountRestClient } from '@3sixty/api-auth-account-rest-client';

const accountClient = new EntityStorageAuthenticationAccountRestClient({
  endpoint: 'https://api.example.org'
});

const id = await accountClient.create('profile', { email: 'alice@example.org' });
await accountClient.update(id, { email: 'alice@example.com' });

const profile = await accountClient.get(id);
console.log(profile.type); // profile

// Create an organization the account is a member and org admin of.
const own = await accountClient.createOrganization({
  profile: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Example Ltd' },
  publicData: ['profile.name']
});

// The public data of an organization or account, by DID needs no sign in.
const published = await accountClient.getPublicDataByIdentity(own.identity);

// Create a new self-controlled DID for the signed in account, this needs a recent sign in.
const did = await accountClient.adoptIdentity();

// Ask to join an organization, then check the outcome.
await accountClient.joinOrganization('did:example:org');
const requests = await accountClient.getOrganizationRequests();
console.log(requests[0]?.status); // pending
await accountClient.cancelOrganizationRequest('did:example:org');
const organization = await accountClient.getOrganization();

// Export the identity with its keys and credentials, import it, and remove it, each needs a recent
// sign in, the server reads the session start from the token of the request.
const exported = await accountClient.exportIdentity();
await accountClient.removeIdentity();
await accountClient.importIdentity(exported);

// Export the account data, and replace it with an export.
const data = await accountClient.exportProfile();
await accountClient.importProfile(data);

await accountClient.leaveOrganization('did:example:org');
```

## EntityStorageAuthenticationAccountAdminRestClient

```typescript
import { EntityStorageAuthenticationAccountAdminRestClient } from '@3sixty/api-auth-account-rest-client';
import { AuthenticationAccountHelper } from '@3sixty/api-auth-models';

const adminClient = new EntityStorageAuthenticationAccountAdminRestClient({
  endpoint: 'https://api.example.org'
});

// Admins without escalated privilege include a recent proof that the account owns the DID, made over
// AuthenticationAccountHelper.identityProofDocument(accountId, did, nodeIdentity) with an
// authentication verification method of the DID and the proof purpose authentication.
await adminClient.create(
  '01a17afb-e05f-7939-83f2-d4f04c4bdf2e',
  'identity',
  AuthenticationAccountHelper.createIdentityData('did:example:alice'),
  undefined,
  proof
);

// Admins work across every account of the tenant.
const identities = await adminClient.query('01a17afb-e05f-7939-83f2-d4f04c4bdf2e', 'identity');
console.log(identities.entities.length); // 1
```

## OrganizationRequestAdminRestClient

```typescript
import { OrganizationRequestAdminRestClient } from '@3sixty/api-auth-account-rest-client';

const requestClient = new OrganizationRequestAdminRestClient({
  endpoint: 'https://api.example.org'
});

const pending = await requestClient.query('pending');
await requestClient.accept(pending.entities[0].id);
```

## EntityStorageAuthenticationAccountAdminRestClient roles

```typescript
import { EntityStorageAuthenticationAccountAdminRestClient } from '@3sixty/api-auth-account-rest-client';

const adminClient = new EntityStorageAuthenticationAccountAdminRestClient({
  endpoint: 'https://api.example.org'
});

// The roles the caller may grant and revoke, then make another account a user admin.
const assignable = await adminClient.getAssignableRoles();
await adminClient.addRole('01a17afb-e05f-7939-83f2-d4f04c4bdf2e', 'user-admin');
const roles = await adminClient.getRoles('01a17afb-e05f-7939-83f2-d4f04c4bdf2e');
await adminClient.removeRole('01a17afb-e05f-7939-83f2-d4f04c4bdf2e', 'user-admin');
```

## OrganizationRestClient

```typescript
import { OrganizationRestClient } from '@3sixty/api-auth-account-rest-client';

const organizationClient = new OrganizationRestClient({
  endpoint: 'https://api.example.org'
});

// Admins create organizations, a node controlled DID is created when none is given.
const organization = await organizationClient.create({
  profile: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Example Ltd' },
  publicData: ['profile.name']
});

// An existing DID needs a proof by it over AuthenticationAccountHelper.organizationProofDocument.
await organizationClient.create({ identity: 'did:example:partner', proof });

// Members and admins read the profile, others the public data.
const byDid = await organizationClient.get(organization.identity);
console.log(byDid.profile?.name ?? byDid.public?.[0]?.name); // Example Ltd

// Org admins change the profile, logo and public data, a null logo removes it.
await organizationClient.update(organization.id, {
  profile: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Example Ltd' },
  logo: null,
  publicData: ['profile.name']
});

// Org admins list the members and grant or revoke org admin.
const members = await organizationClient.queryMembers(organization.id);
await organizationClient.addAdmin(organization.id, members.entities[0].accountId);

// Admins export the identity of an organization the node holds the keys of, with a recent sign in,
// and create an organization from an export.
const exported = await organizationClient.exportIdentity(organization.id);
await organizationClient.create({ identityImport: exported });
```
