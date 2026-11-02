# Variable: ExportFileType

> `const` **ExportFileType**: `object`

The types of the files the node exports, held in their type field so an import can check it was
given the right kind of file before doing anything else.

## Type Declaration

### AccountIdentity {#accountidentity}

> `readonly` **AccountIdentity**: `"account-identity"` = `"account-identity"`

The identity of an account with its private keys and credentials.

### AccountProfile {#accountprofile}

> `readonly` **AccountProfile**: `"account-profile"` = `"account-profile"`

The account data of an account, other than its identity.

### OrganizationIdentity {#organizationidentity}

> `readonly` **OrganizationIdentity**: `"organization-identity"` = `"organization-identity"`

The identity of an organization with its private keys.
