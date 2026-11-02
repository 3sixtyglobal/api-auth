# Interface: IOrganizationRequestRejectRequest

Reject a request to join an organization.

## Properties

### pathParams {#pathparams}

> **pathParams**: `object`

The path parameters for the request.

#### id

> **id**: `string`

The unique identifier of the request.

***

### body? {#body}

> `optional` **body?**: `object`

The rejection.

#### reason?

> `optional` **reason?**: `string`

The i18n key of the reason to give the account, for the client to translate.
