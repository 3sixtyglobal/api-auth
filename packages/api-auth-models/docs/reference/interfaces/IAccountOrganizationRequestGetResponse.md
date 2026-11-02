# Interface: IAccountOrganizationRequestGetResponse

The requests of the signed in account to join organizations.

## Properties

### body {#body}

> **body**: `object`

The response body.

#### requests

> **requests**: [`IOrganizationRequestDetails`](IOrganizationRequestDetails.md)[]

The latest request to each organization, pending or answered, the latest changed first.
