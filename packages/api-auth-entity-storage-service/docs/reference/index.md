# @twin.org/api-auth-entity-storage-service

## Classes

- [AuthenticationAuditEntry](classes/AuthenticationAuditEntry.md)
- [AuthenticationRateEntry](classes/AuthenticationRateEntry.md)
- [AuthenticationUser](classes/AuthenticationUser.md)
- [AuthHeaderProcessor](classes/AuthHeaderProcessor.md)
- [EntityStorageAuthenticationAdminService](classes/EntityStorageAuthenticationAdminService.md)
- [EntityStorageAuthenticationAuditService](classes/EntityStorageAuthenticationAuditService.md)
- [EntityStorageAuthenticationRateService](classes/EntityStorageAuthenticationRateService.md)
- [EntityStorageAuthenticationService](classes/EntityStorageAuthenticationService.md)
- [PasswordHelper](classes/PasswordHelper.md)
- [TokenHelper](classes/TokenHelper.md)

## Interfaces

- [IAuthHeaderProcessorConfig](interfaces/IAuthHeaderProcessorConfig.md)
- [IAuthHeaderProcessorConstructorOptions](interfaces/IAuthHeaderProcessorConstructorOptions.md)
- [IEntityStorageAuthenticationAdminServiceConfig](interfaces/IEntityStorageAuthenticationAdminServiceConfig.md)
- [IEntityStorageAuthenticationAdminServiceConstructorOptions](interfaces/IEntityStorageAuthenticationAdminServiceConstructorOptions.md)
- [IEntityStorageAuthenticationAuditServiceConfig](interfaces/IEntityStorageAuthenticationAuditServiceConfig.md)
- [IEntityStorageAuthenticationAuditServiceConstructorOptions](interfaces/IEntityStorageAuthenticationAuditServiceConstructorOptions.md)
- [IEntityStorageAuthenticationRateServiceConfig](interfaces/IEntityStorageAuthenticationRateServiceConfig.md)
- [IEntityStorageAuthenticationRateServiceConstructorOptions](interfaces/IEntityStorageAuthenticationRateServiceConstructorOptions.md)
- [IEntityStorageAuthenticationServiceConfig](interfaces/IEntityStorageAuthenticationServiceConfig.md)
- [IEntityStorageAuthenticationServiceConstructorOptions](interfaces/IEntityStorageAuthenticationServiceConstructorOptions.md)

## Variables

- [restEntryPoints](variables/restEntryPoints.md)
- [tagsAuthenticationAdmin](variables/tagsAuthenticationAdmin.md)
- [tagsAuthenticationAudit](variables/tagsAuthenticationAudit.md)
- [tagsAuthentication](variables/tagsAuthentication.md)

## Functions

- [generateRestRoutesAuthenticationAdmin](functions/generateRestRoutesAuthenticationAdmin.md)
- [authenticationAdminCreateUser](functions/authenticationAdminCreateUser.md)
- [authenticationAdminUpdateUser](functions/authenticationAdminUpdateUser.md)
- [authenticationAdminUpdateUserPassword](functions/authenticationAdminUpdateUserPassword.md)
- [authenticationAdminGetUser](functions/authenticationAdminGetUser.md)
- [authenticationAdminGetUserByIdentity](functions/authenticationAdminGetUserByIdentity.md)
- [authenticationAdminRemoveUser](functions/authenticationAdminRemoveUser.md)
- [generateRestRoutesAuthenticationAudit](functions/generateRestRoutesAuthenticationAudit.md)
- [authenticationAuditCreate](functions/authenticationAuditCreate.md)
- [authenticationAuditGet](functions/authenticationAuditGet.md)
- [authenticationAuditUpdate](functions/authenticationAuditUpdate.md)
- [authenticationAuditRemove](functions/authenticationAuditRemove.md)
- [authenticationAuditQuery](functions/authenticationAuditQuery.md)
- [generateRestRoutesAuthentication](functions/generateRestRoutesAuthentication.md)
- [authenticationLogin](functions/authenticationLogin.md)
- [authenticationLogout](functions/authenticationLogout.md)
- [authenticationRefreshToken](functions/authenticationRefreshToken.md)
- [authenticationUpdatePassword](functions/authenticationUpdatePassword.md)
- [initSchema](functions/initSchema.md)
