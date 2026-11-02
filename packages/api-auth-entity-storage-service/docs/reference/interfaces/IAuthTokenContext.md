# Interface: IAuthTokenContext

The context resolved from an access token, everything a request needs that does not depend on
the route being called.

## Properties

### tenantId? {#tenantid}

> `optional` **tenantId?**: `string`

The tenant id from the token, if it carried one.

***

### tenantOrganizationId? {#tenantorganizationid}

> `optional` **tenantOrganizationId?**: `string`

The organization id of the tenant the token belongs to.

***

### tenantPublicOrigin? {#tenantpublicorigin}

> `optional` **tenantPublicOrigin?**: `string`

The public origin of the tenant the token belongs to.

***

### accountId? {#accountid}

> `optional` **accountId?**: `string`

The account id of the verified user. This is the token subject.

***

### expires? {#expires}

> `optional` **expires?**: `number`

The expiry of the token in milliseconds since the epoch, if it carried one.

***

### sessionStart? {#sessionstart}

> `optional` **sessionStart?**: `number`

When the session of the token started in seconds since the epoch, if it carried one.
