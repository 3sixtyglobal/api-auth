# 3Sixty API Auth

This repository provides authentication for the 3Sixty API stack, covering sign-in, token refresh, password management and user administration backed by entity storage, with an auth header processor that resolves the caller for each request.

Alongside these flows, the repository includes authentication audit logging, rate limiting of sensitive actions and a tenant override processor that lets callers holding the escalated privilege role act on another tenant. Route access is governed by the authorization packages, so each route declares its default authorization rather than checking scopes itself.

## Packages

- [api-auth-models](packages/api-auth-models/README.md) - Contracts for authentication audit and rate limiting.
- [api-auth-service](packages/api-auth-service/README.md) - Authentication audit and rate limiting services, tenant override processing and audit REST routes backed by entity storage.
- [api-auth-rest-client](packages/api-auth-rest-client/README.md) - REST client for the authentication audit endpoints.
- [api-auth-entity-storage-models](packages/api-auth-entity-storage-models/README.md) - Contracts for authentication flows and admin user management with entity storage.
- [api-auth-entity-storage-service](packages/api-auth-entity-storage-service/README.md) - Authentication service implementation and REST routes backed by entity storage.
- [api-auth-entity-storage-rest-client](packages/api-auth-entity-storage-rest-client/README.md) - REST clients for authentication and admin operations against entity storage endpoints.
- [api-auth-connector-entity-storage](packages/api-auth-connector-entity-storage/README.md) - Authentication provider that verifies passwords for accounts held in entity storage.
- [api-auth-oauth-models](packages/api-auth-oauth-models/README.md) - Contracts and helpers for OAuth authentication providers.
- [api-auth-oauth-connector-google](packages/api-auth-oauth-connector-google/README.md) - Authentication provider that signs accounts in with Google.
- [api-auth-oauth-connector-microsoft](packages/api-auth-oauth-connector-microsoft/README.md) - Authentication provider that signs accounts in with Microsoft.
- [api-auth-oauth-service](packages/api-auth-oauth-service/README.md) - OAuth sign in flow and REST routes for authentication providers.
- [api-auth-account-service](packages/api-auth-account-service/README.md) - Account data storage, request processing and REST routes backed by entity storage.
- [api-auth-account-rest-client](packages/api-auth-account-rest-client/README.md) - REST clients for account data and account data administration.

## Contributing

To contribute to this package see the guidelines for building and publishing in [CONTRIBUTING](./CONTRIBUTING.md)

## Origin

This repository is derived from the original [iotaledger/twin-api-auth](https://github.com/iotaledger/twin-api-auth) repository.
