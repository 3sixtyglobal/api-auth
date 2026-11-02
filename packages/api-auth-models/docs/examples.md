# Auth Models Examples

Use these snippets to shape authentication audit entries, audit queries and rate limit configuration consistently across services and clients.

## Audit Entries

```typescript
import { AuthAuditEvent, type IAuthenticationAuditEntry } from '@3sixty/api-auth-models';

const entry: IAuthenticationAuditEntry = {
  id: '018f2f67bb9d4a0caad8386f56df85ce',
  event: AuthAuditEvent.LoginFailure,
  dateCreated: '2026-04-13T10:00:00.000Z',
  actorId: 'did:example:user:alice',
  tenantId: 'did:example:tenant:alpha',
  data: {
    reason: 'invalid-password'
  }
};

console.log(entry.event); // login-failure
```

## Audit Requests

```typescript
import type { IAuditCreateRequest, IAuditQueryRequest } from '@3sixty/api-auth-models';

const createRequest: IAuditCreateRequest = {
  body: {
    event: 'account-locked',
    actorId: 'did:example:user:alice'
  }
};

const queryRequest: IAuditQueryRequest = {
  query: {
    actorId: 'did:example:user:alice',
    startDate: '2026-04-01T00:00:00.000Z',
    endDate: '2026-04-30T23:59:59.999Z',
    limit: '25'
  }
};

console.log(createRequest.body.event); // account-locked
console.log(queryRequest.query?.limit); // 25
```

## Rate Limit Configuration

```typescript
import type { IAuthenticationRateActionConfig } from '@3sixty/api-auth-models';

const loginLimit: IAuthenticationRateActionConfig = {
  maxAttempts: 5,
  windowMinutes: 15
};

console.log(loginLimit.maxAttempts); // 5
```

## Authentication Providers

```typescript
import {
  AuthenticationProviderFactory,
  type IAuthenticationProvider
} from '@3sixty/api-auth-models';

const provider: IAuthenticationProvider<{ token: string }> = {
  className: () => 'ExampleProvider',
  authenticate: async credentials => ({
    providerAccountId: credentials.token,
    email: 'alice@example.org',
    profile: {
      '@context': 'https://schema.org',
      '@type': 'Person',
      givenName: 'Alice'
    }
  })
};

AuthenticationProviderFactory.register('example', () => provider);
```

## Account Data

```typescript
import {
  AuthenticationAccountDataType,
  AuthenticationAccountHelper,
  type IAccountIdentityData,
  type IAuthenticationAccountData
} from '@3sixty/api-auth-models';

const identity: IAuthenticationAccountData<IAccountIdentityData> = {
  id: '01a17afc-611a-7d5b-a898-e0e20088b36e',
  accountId: '01a17afb-e05f-7939-83f2-d4f04c4bdf2e',
  type: AuthenticationAccountDataType.Identity,
  data: AuthenticationAccountHelper.createIdentityData('did:example:alice'),
  dateCreated: '2026-01-12T09:05:23.123Z',
  dateModified: '2026-01-12T09:05:23.123Z'
};

console.log(identity.data); // { '@context': 'https://www.w3.org/ns/did/v1', id: 'did:example:alice' }
console.log(AuthenticationAccountHelper.getIdentity(identity.data)); // did:example:alice
```

Every value of account data is a JSON object. The `identity`, `organization` and `vc` types have fixed JSON-LD shapes, built and read with the helper.

```typescript
import { AuthenticationAccountHelper } from '@3sixty/api-auth-models';

const organization = AuthenticationAccountHelper.createOrganizationData('did:example:org');
console.log(organization); // { '@context': 'https://schema.org', '@type': 'Organization', identifier: 'did:example:org' }
console.log(AuthenticationAccountHelper.getOrganization(organization)); // did:example:org

// A credential is held as a JSON credential object with an embedded proof, any other value,
// such as a JWT, is not a credential.
const credential = AuthenticationAccountHelper.getCredential({
  '@context': ['https://www.w3.org/2018/credentials/v1', 'https://schema.org'],
  type: ['VerifiableCredential', 'OrganizationMembershipCredential'],
  issuer: 'did:example:org',
  credentialSubject: { id: 'did:example:alice', memberOf: { id: 'did:example:org' } },
  credentialStatus: {
    id: 'did:example:org#revocation',
    type: 'RevocationBitmap2022',
    revocationBitmapIndex: '5'
  },
  proof: { type: 'DataIntegrityProof', proofValue: 'z58DAdFfa9...' }
});
if (credential) {
  console.log(AuthenticationAccountHelper.getCredentialIssuer(credential)); // did:example:org
  console.log(AuthenticationAccountHelper.getCredentialSubjects(credential)[0].id); // did:example:alice
  console.log(AuthenticationAccountHelper.getCredentialRevocationIndex(credential)); // 5
}
console.log(AuthenticationAccountHelper.getCredential('eyJhbGciOi...')); // undefined
```

The `avatar` type holds the picture of an account, one item per account, the default, kept apart from the profiles. It is a schema.org `ImageObject` with the image in a base64 data URL.

```typescript
import {
  AuthenticationAccountDataType,
  type IAuthenticationAccountData
} from '@3sixty/api-auth-models';
import type { IJsonLdNodeObject } from '@3sixty/data-json-ld';

const avatar: IAuthenticationAccountData<IJsonLdNodeObject> = {
  id: '01a17afc-611a-7d5b-a898-e0e20088b36f',
  accountId: '01a17afb-e05f-7939-83f2-d4f04c4bdf2e',
  type: AuthenticationAccountDataType.Avatar,
  data: {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    encodingFormat: 'image/jpeg',
    contentUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...',
    width: 512,
    height: 512
  },
  isDefault: true,
  dateCreated: '2026-01-12T09:05:23.123Z',
  dateModified: '2026-01-12T09:05:23.123Z'
};
```

An authentication provider that holds a photo returns it as the `avatar` of the identity, in the same shape, `null` when it holds none, and leaves it out when the photo could not be fetched, so a stored avatar is kept.

## E-mail Addresses

```typescript
import { EmailHelper } from '@3sixty/api-auth-models';

// Addresses are trimmed and stored in lower case, so they match whatever the case.
console.log(EmailHelper.normalise(' Alice@Example.ORG ')); // alice@example.org
```

## Identity Proof Document

To adopt a DID it already owns, an account signs this document with a verification method listed under the DID's `authentication` relationship, using the proof purpose `authentication`. Pass the DID of the node, so the proof can only be used on that node.

```typescript
import { AuthenticationAccountHelper } from '@3sixty/api-auth-models';

const document = AuthenticationAccountHelper.identityProofDocument(
  '01a17afb-e05f-7939-83f2-d4f04c4bdf2e',
  'did:example:alice',
  'did:example:node'
);
console.log(document['@type']); // AuthorizeAction

// Registering an existing DID as an organization is proved the same way over this document.
const organizationDocument = AuthenticationAccountHelper.organizationProofDocument(
  'did:example:partner',
  'did:example:node'
);
console.log(organizationDocument['@type']); // RegisterAction
```

The proof must be made shortly before the request, by default within 5 minutes, as its `created` date is checked.

## Read Only Account Data

Profiles and avatars stored from an authentication provider are marked read only with the schema.org `readonlyValue` property, so the account cannot change them.

```typescript
import { AuthenticationAccountHelper } from '@3sixty/api-auth-models';

const profile = AuthenticationAccountHelper.markReadOnly({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Alice'
});
console.log(AuthenticationAccountHelper.isReadOnly(profile)); // true
```

## Organizations

Organizations are registered on the node with a DID, their profile, logo and public data are held as account data owned by the organization DID.

```typescript
import type { IOrganization, IOrganizationCreate } from '@3sixty/api-auth-models';

const create: IOrganizationCreate = {
  profile: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Example Ltd'
  },
  publicData: ['profile.name']
};

const organization: IOrganization = {
  id: '01a17afc-611a-7d5b-a898-e0e20088b36f',
  identity: 'did:example:organization',
  profile: create.profile,
  publicData: create.publicData,
  isAdmin: true,
  dateCreated: '2026-01-12T09:05:23.123Z',
  dateModified: '2026-01-12T09:05:23.123Z'
};

console.log(organization.identity); // did:example:organization
```

## Recent Sign In

Operations that bind, hand out or remove keys, or remove an account, need the session to have started recently. `RecentSignInHelper.guard` refuses a session start older than the window, a missing one, or one more than `MAX_FUTURE_SKEW_SECONDS`, 60, in the future, such as a value in milliseconds, with an `UnauthorizedError` whose message is `recentSignInHelper.recentSignInRequired`, so a client can ask the user to sign in again.

```typescript
import { RecentSignInHelper } from '@3sixty/api-auth-models';

// The session start is the sst claim of the token, in seconds.
RecentSignInHelper.guard(sessionStart, RecentSignInHelper.DEFAULT_MAX_AGE_SECONDS);
```
