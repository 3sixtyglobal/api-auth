# Interface: IAuthorizeRequest

Check the e-mail address and password of a password account and issue an OAuth 2.0 authorization code.

## Properties

### body {#body}

> **body**: [`IAuthorizationCodeRequest`](IAuthorizationCodeRequest.md) & `object`

The body of the request.

#### Type Declaration

##### email

> **email**: `string`

The e-mail address of the account.

##### password

> **password**: `string`

The password of the account.
