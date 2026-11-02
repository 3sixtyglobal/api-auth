# Class: EntityStorageOrganizationRequestAdminService

Reviews the requests of accounts to join the organizations of the tenant using entity storage.
Callers holding escalated privilege review the requests of every organization, other callers only
those of the organizations they are an org admin of, other requests are reported as missing.

## Implements

- `IOrganizationRequestAdminComponent`

## Constructors

### Constructor

> **new EntityStorageOrganizationRequestAdminService**(`options?`): `EntityStorageOrganizationRequestAdminService`

Create a new instance of EntityStorageOrganizationRequestAdminService.

#### Parameters

##### options?

[`IEntityStorageOrganizationRequestAdminServiceConstructorOptions`](../interfaces/IEntityStorageOrganizationRequestAdminServiceConstructorOptions.md)

The options for the service.

#### Returns

`EntityStorageOrganizationRequestAdminService`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_VERIFICATION\_METHOD\_ID {#default_verification_method_id}

> `readonly` `static` **DEFAULT\_VERIFICATION\_METHOD\_ID**: `string` = `"trust-assertion"`

The default verification method of the organization that signs the membership credential.

***

### DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE {#default_escalated_privilege_role}

> `readonly` `static` **DEFAULT\_ESCALATED\_PRIVILEGE\_ROLE**: `string` = `"global-admin"`

The default role that grants escalated privilege.

***

### DEFAULT\_AUTHORIZATION\_MODEL\_ID {#default_authorization_model_id}

> `readonly` `static` **DEFAULT\_AUTHORIZATION\_MODEL\_ID**: `string` = `"system"`

The default authorization model ID used to look up roles.

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

#### Throws

NotFoundError when the request does not exist, or is for an organization the caller
does not manage.

#### Implementation of

`IOrganizationRequestAdminComponent.get`

***

### query() {#query}

> **query**(`status?`, `organization?`, `cursor?`, `limit?`): `Promise`\<\{ `entities`: `IOrganizationRequestDetails`[]; `cursor?`: `string`; \}\>

Query the requests of the organizations the caller manages, the earliest first.

#### Parameters

##### status?

`OrganizationRequestStatus`

The status of the requests to return, all when omitted.

##### organization?

`string`

The organization of the requests to return, all the caller manages when omitted.

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

Count the requests of a status of the organizations the caller manages, up to a cap so counting
stays bounded on every storage.

#### Parameters

##### status

`OrganizationRequestStatus`

The status of the requests to count.

##### organization?

`string`

The organization of the requests to count, all the caller manages when omitted.

#### Returns

`Promise`\<`IOrganizationRequestCount`\>

The number of requests, and whether there are more than the cap.

#### Throws

GuardError when the status is not a request status.

#### Implementation of

`IOrganizationRequestAdminComponent.countRequests`

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

NotFoundError when the request does not exist, or is for an organization the caller
does not manage.

#### Throws

ConflictError when the request is not pending.

#### Throws

UnprocessableError when the account no longer has an identity.

#### Throws

ForbiddenError when the account holds escalated privilege and the caller does not, or
is the caller's own account and the caller does not hold escalated privilege.

#### Throws

NotFoundError when the organization is not registered.

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

The i18n key of the reason to give the account, for the client to translate.

#### Returns

`Promise`\<`void`\>

A promise that resolves when the request has been rejected.

#### Throws

NotFoundError when the request does not exist, or is for an organization the caller
does not manage.

#### Throws

ConflictError when the request is not pending.

#### Throws

UnprocessableError when the reason is not an i18n key.

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

#### Throws

ForbiddenError when the account holds escalated privilege and the caller does not.

#### Implementation of

`IOrganizationRequestAdminComponent.removeForAccount`
