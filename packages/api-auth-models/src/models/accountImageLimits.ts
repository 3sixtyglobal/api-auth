// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { MimeTypes } from "@3sixty/web";

/**
 * The limits of the images an account or an organization uploads as account data, the avatar of an
 * account and the logo of an organization.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export const AccountImageLimits = {
	/**
	 * The content type of an avatar the account uploads.
	 */
	AvatarContentType: MimeTypes.Jpeg,

	/**
	 * The largest avatar the account uploads, in decoded bytes.
	 */
	AvatarMaxBytes: 262144,

	/**
	 * The largest width and height of an avatar or a logo, in pixels.
	 */
	MaxDimension: 1024,

	/**
	 * The content types of a logo.
	 */
	LogoContentTypes: [MimeTypes.Png, MimeTypes.Jpeg, MimeTypes.Svg],

	/**
	 * The largest logo, in decoded bytes.
	 */
	LogoMaxBytes: 262144
} as const;
