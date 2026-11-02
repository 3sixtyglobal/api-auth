# Interface: IOrganizationMemberQueryResponse

The members of an organization.

## Properties

### body {#body}

> **body**: `object`

The response body.

#### entities

> **entities**: [`IOrganizationMember`](IOrganizationMember.md)[]

The returned members.

#### cursor?

> `optional` **cursor?**: `string`

The cursor to retrieve the next page, if any.
