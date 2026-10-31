# API Auth Account Rest Client Examples

Use these clients to manage account data from browser or server-side TypeScript applications.

## EntityStorageAuthenticationAccountRestClient

```typescript
import { EntityStorageAuthenticationAccountRestClient } from '@3sixty/api-auth-account-rest-client';

const accountClient = new EntityStorageAuthenticationAccountRestClient({
  endpoint: 'https://api.example.org'
});

const id = await accountClient.create('privateProfile', { email: 'alice@example.org' });
await accountClient.update(id, { email: 'alice@example.com' });

const profile = await accountClient.get(id);
console.log(profile.type); // privateProfile

// Create a new self-controlled DID for the signed in account, this needs a recent sign in.
const did = await accountClient.adoptIdentity();

// Ask to join an organization, then check the outcome.
await accountClient.joinOrganization('did:example:org');
const request = await accountClient.getOrganizationRequest();
console.log(request?.status); // pending
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

## OrganizationRestClient

```typescript
import { OrganizationRestClient } from '@3sixty/api-auth-account-rest-client';

const organizationClient = new OrganizationRestClient({
  endpoint: 'https://api.example.org'
});

// Admins create organizations, a node controlled DID is created when none is given.
const organization = await organizationClient.create({
  publicProfile: { '@context': 'https://schema.org', '@type': 'Organization', name: 'Example Ltd' }
});

// An existing DID needs a proof by it over AuthenticationAccountHelper.organizationProofDocument.
await organizationClient.create({ identity: 'did:example:partner', proof });

// Any signed in account reads the public profile, members also see the private profile.
const byDid = await organizationClient.get(organization.identity);
console.log(byDid.publicProfile?.name); // Example Ltd

// Admins update the profiles of any organization.
await organizationClient.update(organization.id, undefined, {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  email: 'office@example.org'
});

// Admins export the identity of an organization the node holds the keys of, with a recent sign in,
// and create an organization from an export.
const exported = await organizationClient.exportIdentity(organization.id);
await organizationClient.create({ identityImport: exported });
```
