# Interface: IAvatarFetchOptions

The limits a photo is fetched with from an authentication provider.

## Properties

### maxBytes? {#maxbytes}

> `optional` **maxBytes?**: `number`

The largest photo accepted, in bytes.

#### Default

```ts
1048576
```

***

### timeoutMs? {#timeoutms}

> `optional` **timeoutMs?**: `number`

How long to wait for a photo, including reading its body, in milliseconds.

#### Default

```ts
10000
```
