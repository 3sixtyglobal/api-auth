# Class: OrganizationRequestHelper

Helper class for the requests to join an organization, shared by the account and admin services.

## Constructors

### Constructor

> **new OrganizationRequestHelper**(): `OrganizationRequestHelper`

#### Returns

`OrganizationRequestHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### COUNT\_CAP {#count_cap}

> `readonly` `static` **COUNT\_CAP**: `number` = `1000`

The most requests a count reads, so counting stays bounded on every storage.

## Methods

### get() {#get}

> `static` **get**(`storage`, `id`): `Promise`\<`IOrganizationRequestDetails`\>

Get a request.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`OrganizationRequest`](OrganizationRequest.md)\>

The entity storage for the requests.

##### id

`string`

The unique identifier of the request.

#### Returns

`Promise`\<`IOrganizationRequestDetails`\>

The request.

#### Throws

NotFoundError when the request does not exist.

***

### getLatest() {#getlatest}

> `static` **getLatest**(`storage`, `accountId`): `Promise`\<`IOrganizationRequestDetails` \| `undefined`\>

Get the request of an account that was changed last.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`OrganizationRequest`](OrganizationRequest.md)\>

The entity storage for the requests.

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`IOrganizationRequestDetails` \| `undefined`\>

The request, or undefined when the account has made none.

***

### findForAccount() {#findforaccount}

> `static` **findForAccount**(`storage`, `accountId`): `Promise`\<\{ `pending?`: `IOrganizationRequestDetails`; `latest?`: `IOrganizationRequestDetails`; \}\>

Find the pending request of an account and the request changed last, reading its requests once.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`OrganizationRequest`](OrganizationRequest.md)\>

The entity storage for the requests.

##### accountId

`string`

The account id.

#### Returns

`Promise`\<\{ `pending?`: `IOrganizationRequestDetails`; `latest?`: `IOrganizationRequestDetails`; \}\>

A pending request, and the latest request, each undefined when there is none.

***

### findPending() {#findpending}

> `static` **findPending**(`storage`, `accountId`, `organization?`): `Promise`\<`IOrganizationRequestDetails` \| `undefined`\>

Find a pending request of an account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`OrganizationRequest`](OrganizationRequest.md)\>

The entity storage for the requests.

##### accountId

`string`

The account id.

##### organization?

`string`

The DID of the organization, any organization when omitted.

#### Returns

`Promise`\<`IOrganizationRequestDetails` \| `undefined`\>

The request, or undefined when none is pending.

***

### findAllPending() {#findallpending}

> `static` **findAllPending**(`storage`, `accountId`, `organization?`): `Promise`\<`IOrganizationRequestDetails`[]\>

Find every pending request of an account.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`OrganizationRequest`](OrganizationRequest.md)\>

The entity storage for the requests.

##### accountId

`string`

The account id.

##### organization?

`string`

The DID of the organization, any organization when omitted.

#### Returns

`Promise`\<`IOrganizationRequestDetails`[]\>

The requests.

***

### findLatestByOrganization() {#findlatestbyorganization}

> `static` **findLatestByOrganization**(`storage`, `accountId`): `Promise`\<`IOrganizationRequestDetails`[]\>

Find the latest request of an account to each organization, pending or answered.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`OrganizationRequest`](OrganizationRequest.md)\>

The entity storage for the requests.

##### accountId

`string`

The account id.

#### Returns

`Promise`\<`IOrganizationRequestDetails`[]\>

The requests, the latest changed first.

***

### query() {#query}

> `static` **query**(`storage`, `status?`, `organization?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `IOrganizationRequestDetails`[]; `cursor?`: `string`; \}\>

Query the requests, the earliest first.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`OrganizationRequest`](OrganizationRequest.md)\>

The entity storage for the requests.

##### status?

`OrganizationRequestStatus`

The status of the requests to return, all when omitted.

##### organization?

`string` \| `string`[]

The organization, or organizations, of the requests to return, all when omitted.

##### cursor?

`string`

The cursor to request the next page.

##### limit?

`number`

The maximum number of requests to return.

#### Returns

`Promise`\<\{ `entities`: `IOrganizationRequestDetails`[]; `cursor?`: `string`; \}\>

The requests and a cursor when there are more.

***

### count() {#count}

> `static` **count**(`storage`, `status`, `organization`, `cap?`): `Promise`\<\{ `count`: `number`; `capped`: `boolean`; \}\>

Count the requests of a status up to a cap. Storage count is not used, as some storage reads
every match to count, so the matches are read a page at a time and the reading stops past the
cap.

#### Parameters

##### storage

`IEntityStorageConnector`\<[`OrganizationRequest`](OrganizationRequest.md)\>

The entity storage for the requests.

##### status

`OrganizationRequestStatus`

The status of the requests to count.

##### organization

`string` \| `string`[] \| `undefined`

The organization, or organizations, of the requests to count, all when omitted.

##### cap?

`number` = `OrganizationRequestHelper.COUNT_CAP`

The most requests counted.

#### Returns

`Promise`\<\{ `count`: `number`; `capped`: `boolean`; \}\>

The number of requests, the cap when there are more, and whether there are more.
