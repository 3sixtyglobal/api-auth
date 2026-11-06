# Interface: IEntityStorageOAuthProviderConnectorConfig

Configuration for the entity storage OAuth provider connector.

## Properties

### loginPageUrl {#loginpageurl}

> **loginPageUrl**: `string`

The address of the page where people enter their e-mail address and password. The browser is
sent there with the OAuth 2.0 authorization request in the query, and the page posts it with
the e-mail address and password to the authorize endpoint.
