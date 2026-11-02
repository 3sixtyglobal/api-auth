# Interface: IEntityStorageAuthenticationServiceConstructorOptions

Options for the EntityStorageAuthenticationService constructor.

## Properties

### userEntityStorageType? {#userentitystoragetype}

> `optional` **userEntityStorageType?**: `string`

The entity storage for the users.

#### Default

```ts
authentication-user
```

***

### passwordResetEntityStorageType? {#passwordresetentitystoragetype}

> `optional` **passwordResetEntityStorageType?**: `string`

The entity storage for password reset and sign up verification tokens, which must be registered.

#### Default

```ts
authentication-password-reset
```

***

### vaultConnectorType? {#vaultconnectortype}

> `optional` **vaultConnectorType?**: `string`

The vault for the private keys.

#### Default

```ts
vault
```

***

### authenticationAuditServiceType? {#authenticationauditservicetype}

> `optional` **authenticationAuditServiceType?**: `string`

The audit service, which must be registered.

#### Default

```ts
authentication-audit
```

***

### authenticationRateServiceType? {#authenticationrateservicetype}

> `optional` **authenticationRateServiceType?**: `string`

The rate service.

#### Default

```ts
authentication-rate
```

***

### tenantAdminComponentType? {#tenantadmincomponenttype}

> `optional` **tenantAdminComponentType?**: `string`

The component to retrieve tenant information.

#### Default

```ts
tenant-admin
```

***

### authenticationAccountAdminComponentType? {#authenticationaccountadmincomponenttype}

> `optional` **authenticationAccountAdminComponentType?**: `string`

The account data admin component, used to store the profile a provider holds. It must be
registered by the time the service starts.

#### Default

```ts
authentication-account-admin
```

***

### authenticationAccountComponentType? {#authenticationaccountcomponenttype}

> `optional` **authenticationAccountComponentType?**: `string`

The account data component, used to remove the identity of a removed account and the keys the
node holds for it. It must be registered by the time the service starts.

#### Default

```ts
authentication-account
```

***

### authorizationComponentType? {#authorizationcomponenttype}

> `optional` **authorizationComponentType?**: `string`

The authorization component, which must be registered. It gives new accounts the default roles,
returns the roles of an account when it signs in and removes the roles of a removed account.

#### Default

```ts
authorization
```

***

### organizationRequestAdminComponentType? {#organizationrequestadmincomponenttype}

> `optional` **organizationRequestAdminComponentType?**: `string`

The organization request admin component, used to remove the requests of a removed account. It
must be registered by the time the service starts.

#### Default

```ts
organization-request-admin
```

***

### messagingComponentType? {#messagingcomponenttype}

> `optional` **messagingComponentType?**: `string`

The messaging component that sends the password reset and sign up e-mails, required when either
is enabled.

#### Default

```ts
messaging
```

***

### taskSchedulerComponentType? {#taskschedulercomponenttype}

> `optional` **taskSchedulerComponentType?**: `string`

The task scheduler, used to send e-mails after the response so the response time does not
reveal whether an account exists, and to remove expired sign ups and tokens.

#### Default

```ts
task-scheduler
```

***

### platformComponentType? {#platformcomponenttype}

> `optional` **platformComponentType?**: `string`

The platform component, used to remove expired sign ups and tokens in every tenant.

#### Default

```ts
platform
```

***

### loggingComponentType? {#loggingcomponenttype}

> `optional` **loggingComponentType?**: `string`

The logging component.

#### Default

```ts
logging
```

***

### config? {#config}

> `optional` **config?**: [`IEntityStorageAuthenticationServiceConfig`](IEntityStorageAuthenticationServiceConfig.md)

The configuration for the authentication.
