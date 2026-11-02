# Variable: OrganizationRequestStatus

> `const` **OrganizationRequestStatus**: `object`

The status of a request to join an organization.

## Type Declaration

### Pending {#pending}

> `readonly` **Pending**: `"pending"` = `"pending"`

Waiting for an admin to accept or reject it.

### Accepted {#accepted}

> `readonly` **Accepted**: `"accepted"` = `"accepted"`

Accepted, the account has joined the organization.

### Rejected {#rejected}

> `readonly` **Rejected**: `"rejected"` = `"rejected"`

Rejected by an admin.
