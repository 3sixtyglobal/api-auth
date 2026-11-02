# Interface: IPasswordHashOptions

The Argon2id parameters used to hash new passwords.

## Properties

### iterations? {#iterations}

> `optional` **iterations?**: `number`

The number of iterations.

#### Default

```ts
2
```

***

### memoryKiB? {#memorykib}

> `optional` **memoryKiB?**: `number`

The memory to use in kibibytes.

#### Default

```ts
19456
```

***

### parallelism? {#parallelism}

> `optional` **parallelism?**: `number`

The degree of parallelism.

#### Default

```ts
1
```
