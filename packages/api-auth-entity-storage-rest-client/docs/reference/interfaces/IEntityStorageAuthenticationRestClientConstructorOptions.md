# Interface: IEntityStorageAuthenticationRestClientConstructorOptions

Options for the Entity Storage Authentication REST client constructor.

## Extends

- `IBaseRestClientConfig`

## Properties

### cookieName? {#cookiename}

> `optional` **cookieName?**: `string`

The name of the cookie to use for storing the auth token.

#### Default

```ts
access_token
```

***

### endpoint {#endpoint}

> **endpoint**: `string`

The endpoint where the api is hosted.

#### Inherited from

`IBaseRestClientConfig.endpoint`

***

### pathPrefix? {#pathprefix}

> `optional` **pathPrefix?**: `string`

The prefix to the routes.

#### Inherited from

`IBaseRestClientConfig.pathPrefix`

***

### headers? {#headers}

> `optional` **headers?**: `IHttpHeaders`

The headers to include in requests.

#### Inherited from

`IBaseRestClientConfig.headers`

***

### timeout? {#timeout}

> `optional` **timeout?**: `number`

Timeout for requests in ms.

#### Inherited from

`IBaseRestClientConfig.timeout`

***

### includeCredentials? {#includecredentials}

> `optional` **includeCredentials?**: `boolean`

Include credentials in the request, defaults to true.

#### Inherited from

`IBaseRestClientConfig.includeCredentials`

***

### processorTypes? {#processortypes}

> `optional` **processorTypes?**: `string`[]

The types of the processors to run around each request, resolved from the `RestClientProcessorFactory`.

#### Inherited from

`IBaseRestClientConfig.processorTypes`

***

### customHeaders? {#customheaders}

> `optional` **customHeaders?**: () => `Promise`\<`IHttpHeaders`\>

Hook to provide headers asynchronously.

#### Returns

`Promise`\<`IHttpHeaders`\>

A promise that resolves to the headers.

#### Inherited from

`IBaseRestClientConfig.customHeaders`

***

### customAuthHeader? {#customauthheader}

> `optional` **customAuthHeader?**: () => `Promise`\<`string`\>

Hook to provide an authorization header value asynchronously.

#### Returns

`Promise`\<`string`\>

A promise that resolves to the authorization header value.

#### Inherited from

`IBaseRestClientConfig.customAuthHeader`

***

### onAuthFailure? {#onauthfailure}

> `optional` **onAuthFailure?**: (`err`) => `Promise`\<`void`\>

Hook to handle authorization failures asynchronously.

#### Parameters

##### err

`IError`

#### Returns

`Promise`\<`void`\>

A promise that resolves when the auth failure handling is complete.

#### Inherited from

`IBaseRestClientConfig.onAuthFailure`
