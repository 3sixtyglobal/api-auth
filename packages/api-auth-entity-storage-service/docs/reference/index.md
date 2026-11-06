# @3sixty/api-auth-entity-storage-service

## Classes

- [AuthenticationAuthorizationCode](classes/AuthenticationAuthorizationCode.md)
- [AuthenticationPasswordReset](classes/AuthenticationPasswordReset.md)
- [AuthenticationUser](classes/AuthenticationUser.md)
- [AuthenticationUserV0](classes/AuthenticationUserV0.md)
- [AuthenticationUserV1](classes/AuthenticationUserV1.md)
- [AuthHeaderProcessor](classes/AuthHeaderProcessor.md)
- [EntityStorageAuthenticationAdminService](classes/EntityStorageAuthenticationAdminService.md)
- [EntityStorageAuthenticationService](classes/EntityStorageAuthenticationService.md)
- [AccountHelper](classes/AccountHelper.md)
- [AuthTokenCache](classes/AuthTokenCache.md)
- [AuthorizationCodeHelper](classes/AuthorizationCodeHelper.md)
- [PasswordHelper](classes/PasswordHelper.md)
- [PasswordResetHelper](classes/PasswordResetHelper.md)
- [TokenHelper](classes/TokenHelper.md)

## Interfaces

- [IAuthHeaderProcessorConfig](interfaces/IAuthHeaderProcessorConfig.md)
- [IAuthHeaderProcessorConstructorOptions](interfaces/IAuthHeaderProcessorConstructorOptions.md)
- [IAuthTokenContext](interfaces/IAuthTokenContext.md)
- [IEntityStorageAuthenticationAdminServiceConfig](interfaces/IEntityStorageAuthenticationAdminServiceConfig.md)
- [IEntityStorageAuthenticationAdminServiceConstructorOptions](interfaces/IEntityStorageAuthenticationAdminServiceConstructorOptions.md)
- [IEntityStorageAuthenticationServiceConfig](interfaces/IEntityStorageAuthenticationServiceConfig.md)
- [IEntityStorageAuthenticationServiceConstructorOptions](interfaces/IEntityStorageAuthenticationServiceConstructorOptions.md)

## Variables

- [restEntryPoints](variables/restEntryPoints.md)
- [tagsAuthenticationAdmin](variables/tagsAuthenticationAdmin.md)
- [tagsAuthentication](variables/tagsAuthentication.md)

## Functions

- [generateRestRoutesAuthenticationAdmin](functions/generateRestRoutesAuthenticationAdmin.md)
- [authenticationAdminQueryUsers](functions/authenticationAdminQueryUsers.md)
- [authenticationAdminDisableUser](functions/authenticationAdminDisableUser.md)
- [authenticationAdminEnableUser](functions/authenticationAdminEnableUser.md)
- [authenticationAdminCreateUser](functions/authenticationAdminCreateUser.md)
- [authenticationAdminUpdateUserPassword](functions/authenticationAdminUpdateUserPassword.md)
- [authenticationAdminGetUser](functions/authenticationAdminGetUser.md)
- [authenticationAdminUpdateUser](functions/authenticationAdminUpdateUser.md)
- [authenticationAdminGetUserByIdentity](functions/authenticationAdminGetUserByIdentity.md)
- [authenticationAdminRemoveUser](functions/authenticationAdminRemoveUser.md)
- [generateRestRoutesAuthentication](functions/generateRestRoutesAuthentication.md)
- [authenticationLogin](functions/authenticationLogin.md)
- [authenticationAuthorize](functions/authenticationAuthorize.md)
- [authenticationToken](functions/authenticationToken.md)
- [authenticationAuthorizationServerMetadata](functions/authenticationAuthorizationServerMetadata.md)
- [authenticationLoginWithProvider](functions/authenticationLoginWithProvider.md)
- [authenticationRegister](functions/authenticationRegister.md)
- [authenticationRegisterVerify](functions/authenticationRegisterVerify.md)
- [authenticationMe](functions/authenticationMe.md)
- [authenticationRemoveAccount](functions/authenticationRemoveAccount.md)
- [authenticationLogout](functions/authenticationLogout.md)
- [authenticationRefreshToken](functions/authenticationRefreshToken.md)
- [authenticationUpdatePassword](functions/authenticationUpdatePassword.md)
- [authenticationPasswordForgot](functions/authenticationPasswordForgot.md)
- [authenticationPasswordReset](functions/authenticationPasswordReset.md)
- [authenticationPasswordPolicy](functions/authenticationPasswordPolicy.md)
- [authenticationProviders](functions/authenticationProviders.md)
- [initSchema](functions/initSchema.md)
