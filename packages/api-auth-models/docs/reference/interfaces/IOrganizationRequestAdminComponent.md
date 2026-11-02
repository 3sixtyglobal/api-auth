# Interface: IOrganizationRequestAdminComponent

Contract for reviewing the requests of accounts to join an organization.

## Extends

- `IComponent`

## Methods

### get() {#get}

> **get**(`id`): `Promise`\<[`IOrganizationRequestDetails`](IOrganizationRequestDetails.md)\>

Get a request.

#### Parameters

##### id

`string`

The unique identifier of the request.

#### Returns

`Promise`\<[`IOrganizationRequestDetails`](IOrganizationRequestDetails.md)\>

The request.

#### Throws

NotFoundError when the request does not exist.

***

### query() {#query}

> **query**(`status?`, `organization?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: [`IOrganizationRequestDetails`](IOrganizationRequestDetails.md)[]; `cursor?`: `string`; \}\>

Query the requests, the earliest first.

#### Parameters

##### status?

[`OrganizationRequestStatus`](../type-aliases/OrganizationRequestStatus.md)

The status of the requests to return, all when omitted.

##### organization?

`string`

The organization of the requests to return, all when omitted.

##### cursor?

`string`

The cursor to request the next page.

##### limit?

`number`

The maximum number of requests to return.

#### Returns

`Promise`\<\{ `entities`: [`IOrganizationRequestDetails`](IOrganizationRequestDetails.md)[]; `cursor?`: `string`; \}\>

The requests and a cursor when there are more.

***

### countRequests() {#countrequests}

> **countRequests**(`status`, `organization?`): `Promise`\<[`IOrganizationRequestCount`](IOrganizationRequestCount.md)\>

Count the requests of a status, up to a cap so counting stays bounded on every storage.

#### Parameters

##### status

[`OrganizationRequestStatus`](../type-aliases/OrganizationRequestStatus.md)

The status of the requests to count.

##### organization?

`string`

The organization of the requests to count, all when omitted.

#### Returns

`Promise`\<[`IOrganizationRequestCount`](IOrganizationRequestCount.md)\>

The number of requests, and whether there are more than the cap.

#### Throws

GuardError when the status is not a request status.

***

### accept() {#accept}

> **accept**(`id`): `Promise`\<`void`\>

Accept a pending request, issuing a membership credential from the organization and storing
the organization and the credential as the account data of the account.

#### Parameters

##### id

`string`

The unique identifier of the request.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has joined the organization.

#### Throws

NotFoundError when the request does not exist.

#### Throws

ConflictError when the request is not pending.

***

### reject() {#reject}

> **reject**(`id`, `reason?`): `Promise`\<`void`\>

Reject a pending request.

#### Parameters

##### id

`string`

The unique identifier of the request.

##### reason?

`string`

The i18n key of the reason to give the account, for the client to translate.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been rejected.

#### Throws

NotFoundError when the request does not exist.

#### Throws

ConflictError when the request is not pending.

#### Throws

UnprocessableError when the reason is not an i18n key.

***

### removeForAccount() {#removeforaccount}

> **removeForAccount**(`accountId`): `Promise`\<`void`\>

Remove every request of an account, used when the account is removed.

#### Parameters

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the requests have been removed.
