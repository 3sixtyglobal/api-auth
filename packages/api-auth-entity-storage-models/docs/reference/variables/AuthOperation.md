# Variable: AuthOperation

> `const` **AuthOperation**: `object`

The operation a route hands to the auth processors in the processor state, so they can set or
remove the session cookie on the response.

## Type Declaration

### Login {#login}

> `readonly` **Login**: `"login"` = `"login"`

A session was started, the cookie is set to the new token.

### Logout {#logout}

> `readonly` **Logout**: `"logout"` = `"logout"`

The session was ended, the cookie is removed.

### Refresh {#refresh}

> `readonly` **Refresh**: `"refresh"` = `"refresh"`

The token was replaced, the cookie is set to the new token.
