# 3Sixty API

This repository provides a modular API stack for defining contracts, implementing services, exposing server endpoints, and consuming those endpoints from client applications. The packages are designed to work together so teams can compose reliable API capabilities without duplicating cross-cutting concerns such as routing, request processing, authentication, and tenant context handling.

Alongside the core API building blocks, the repository also includes entity storage authentication and tenant processing components that can be adopted independently or integrated into a broader platform architecture. The overall goal is to keep API development consistent, maintainable, and straightforward to extend across different deployment contexts.

## Packages

- [api-auth-entity-storage-models](packages/api-auth-entity-storage-models/README.md) - Contracts for authentication flows and admin user management with entity storage.
- [api-auth-entity-storage-service](packages/api-auth-entity-storage-service/README.md) - Authentication service implementation and REST routes backed by entity storage.
- [api-auth-entity-storage-rest-client](packages/api-auth-entity-storage-rest-client/README.md) - REST clients for authentication and admin operations against entity storage endpoints.

## Contributing

To contribute to this package see the guidelines for building and publishing in [CONTRIBUTING](./CONTRIBUTING.md)

## Origin

This repository is derived from the original [iotaledger/twin-api-auth](https://github.com/iotaledger/twin-api-auth) repository.
