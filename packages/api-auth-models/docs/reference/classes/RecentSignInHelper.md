# Class: RecentSignInHelper

Helper methods for operations that need the caller to have signed in recently, such as exporting
keys or removing an account.

## Constructors

### Constructor

> **new RecentSignInHelper**(): `RecentSignInHelper`

#### Returns

`RecentSignInHelper`

## Properties

### CLASS\_NAME {#class_name}

> `readonly` `static` **CLASS\_NAME**: `string`

Runtime name for the class.

***

### DEFAULT\_MAX\_AGE\_SECONDS {#default_max_age_seconds}

> `readonly` `static` **DEFAULT\_MAX\_AGE\_SECONDS**: `number` = `300`

The default time since signing in within which a sensitive operation is allowed, in seconds.

***

### MAX\_FUTURE\_SKEW\_SECONDS {#max_future_skew_seconds}

> `readonly` `static` **MAX\_FUTURE\_SKEW\_SECONDS**: `number` = `60`

How far in the future a session start may be, to allow for clock skew, in seconds.

## Methods

### guard() {#guard}

> `static` **guard**(`sessionStart`, `maxAgeSeconds`): `void`

Ensure the session started recently, the session start is kept across token refreshes so only
signing in again starts a new one. A start in the future beyond the allowed skew, such as a
value in milliseconds, is refused.

#### Parameters

##### sessionStart

`number` \| `undefined`

When the session started in seconds, refused when omitted.

##### maxAgeSeconds

`number`

How long ago the session may have started, in seconds.

#### Returns

`void`

#### Throws

UnauthorizedError with the key recentSignInRequired when the session is not recent, so
the caller can be asked to sign in again.
