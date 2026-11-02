# Interface: IOrganizationRequestCount

The number of requests to join an organization, counted up to a cap so counting stays bounded on
every storage.

## Properties

### count {#count}

> **count**: `number`

The number of requests, the cap when there are more.

***

### capped {#capped}

> **capped**: `boolean`

True when there are more requests than the cap, so the count is the cap.
