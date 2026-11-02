# Class: OrganizationRequestAdminRestClient

The client to connect to the service that reviews the requests to join an organization.

## Extends

- `BaseRestClient`

## Implements

- `IOrganizationRequestAdminComponent`

## Constructors

### Constructor

> **new OrganizationRequestAdminRestClient**(`config`): `OrganizationRequestAdminRestClient`

Create a new instance of OrganizationRequestAdminRestClient.

#### Parameters

##### config

`IBaseRestClientConfig`

The configuration for the client.

#### Returns

`OrganizationRequestAdminRestClient`

#### Overrides

`BaseRestClient.constructor`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

## Methods

### className() {#classname}

> **className**(): `string`

Returns the class name of the component.

#### Returns

`string`

The class name of the component.

#### Implementation of

`IOrganizationRequestAdminComponent.className`

***

### get() {#get}

> **get**(`id`): `Promise`\<`IOrganizationRequestDetails`\>

Get a request.

#### Parameters

##### id

`string`

The unique identifier of the request.

#### Returns

`Promise`\<`IOrganizationRequestDetails`\>

The request.

#### Implementation of

`IOrganizationRequestAdminComponent.get`

***

### query() {#query}

> **query**(`status?`, `organization?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `IOrganizationRequestDetails`[]; `cursor?`: `string`; \}\>

Query the requests, the earliest first.

#### Parameters

##### status?

`OrganizationRequestStatus`

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

`Promise`\<\{ `entities`: `IOrganizationRequestDetails`[]; `cursor?`: `string`; \}\>

The requests and a cursor when there are more.

#### Implementation of

`IOrganizationRequestAdminComponent.query`

***

### countRequests() {#countrequests}

> **countRequests**(`status`, `organization?`): `Promise`\<`IOrganizationRequestCount`\>

Count the requests of a status, up to a cap.

#### Parameters

##### status

`OrganizationRequestStatus`

The status of the requests to count.

##### organization?

`string`

The organization of the requests to count, all when omitted.

#### Returns

`Promise`\<`IOrganizationRequestCount`\>

The number of requests, and whether there are more than the cap.

#### Implementation of

`IOrganizationRequestAdminComponent.countRequests`

***

### accept() {#accept}

> **accept**(`id`): `Promise`\<`void`\>

Accept a pending request.

#### Parameters

##### id

`string`

The unique identifier of the request.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the account has joined the organization.

#### Implementation of

`IOrganizationRequestAdminComponent.accept`

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

The reason to give the account.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been rejected.

#### Implementation of

`IOrganizationRequestAdminComponent.reject`

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

#### Implementation of

`IOrganizationRequestAdminComponent.removeForAccount`
