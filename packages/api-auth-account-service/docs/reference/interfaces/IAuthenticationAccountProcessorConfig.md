# Interface: IAuthenticationAccountProcessorConfig

Configuration for the authentication account processor.

## Properties

### cacheTtlMs? {#cachettlms}

> `optional` **cacheTtlMs?**: `number`

How long to keep the identity and organization of an account, in milliseconds, 0 disables the cache.

#### Default

```ts
30000
```

***

### noIdentityCacheTtlMs? {#noidentitycachettlms}

> `optional` **noIdentityCacheTtlMs?**: `number`

How long to keep an account without an identity, in milliseconds, 0 does not keep it. An
identity the account adopts clears the entry in this process, other processes may withhold it
for up to this long. It is never longer than cacheTtlMs.

#### Default

```ts
5000
```

***

### cacheCapacity? {#cachecapacity}

> `optional` **cacheCapacity?**: `number`

The maximum number of accounts to keep in the cache.

#### Default

```ts
1000
```
