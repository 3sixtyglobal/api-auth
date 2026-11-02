# Variable: AccountImageLimits

> `const` **AccountImageLimits**: `object`

The limits of the images an account or an organization uploads as account data, the avatar of an
account and the logo of an organization.

## Type Declaration

### AvatarContentType {#avatarcontenttype}

> `readonly` **AvatarContentType**: `"image/jpeg"` = `MimeTypes.Jpeg`

The content type of an avatar the account uploads.

### AvatarMaxBytes {#avatarmaxbytes}

> `readonly` **AvatarMaxBytes**: `262144` = `262144`

The largest avatar the account uploads, in decoded bytes.

### MaxDimension {#maxdimension}

> `readonly` **MaxDimension**: `1024` = `1024`

The largest width and height of an avatar or a logo, in pixels.

### LogoContentTypes {#logocontenttypes}

> `readonly` **LogoContentTypes**: readonly \[`"image/png"`, `"image/jpeg"`, `"image/svg+xml"`\]

The content types of a logo.

### LogoMaxBytes {#logomaxbytes}

> `readonly` **LogoMaxBytes**: `262144` = `262144`

The largest logo, in decoded bytes.
