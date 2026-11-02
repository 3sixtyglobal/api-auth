# Variable: AuthenticationAccountDataType

> `const` **AuthenticationAccountDataType**: `object`

The common types of account data, any other type may also be stored, with a JSON object as its
value. Types are stored in kebab case, so every value here is kebab case.

## Type Declaration

### Profile {#profile}

> `readonly` **Profile**: `"profile"` = `"profile"`

The profile of the account or organization, one item, a JSON-LD object such as a schema.org
Person or Organization.

### PublicData {#publicdata}

> `readonly` **PublicData**: `"public-data"` = `"public-data"`

Which properties of the data of the owner are public, one item, a schema.org ItemList whose
itemListElement holds paths, the first segment an account data type and any further segments a
nested property, such as logo, profile.address or profile.address.addressLocality.

### Logo {#logo}

> `readonly` **Logo**: `"logo"` = `"logo"`

The logo of an organization, a schema.org ImageObject holding a data URL, one item.

### Avatar {#avatar}

> `readonly` **Avatar**: `"avatar"` = `"avatar"`

The picture of the account, a schema.org ImageObject holding a data URL, one item per account.

### Identity {#identity}

> `readonly` **Identity**: `"identity"` = `"identity"`

The DID of the account, a JSON-LD node with the DID context and the DID as its id.

### Organization {#organization}

> `readonly` **Organization**: `"organization"` = `"organization"`

The organization of the account, a schema.org Organization with the DID as its identifier.

### VerifiableCredential {#verifiablecredential}

> `readonly` **VerifiableCredential**: `"vc"` = `"vc"`

A verifiable credential held by the account, one row per credential, a JSON credential object
with an embedded proof, such as an organization membership credential.
