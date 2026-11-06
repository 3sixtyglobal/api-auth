# Variable: AuthenticationProviderType

> `const` **AuthenticationProviderType**: `object`

The protocol an authentication provider signs accounts in with.

## Type Declaration

### Basic {#basic}

> `readonly` **Basic**: `"basic"` = `"basic"`

The e-mail address and password are sent to the node directly.

### OAuth2 {#oauth2}

> `readonly` **OAuth2**: `"oauth2"` = `"oauth2"`

The browser is sent through an OAuth 2.0 authorization code flow.
