// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { AuthenticationAccountHelper } from "@3sixty/api-auth-models";
import { Is, ObjectHelper, UnprocessableError } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import { SchemaOrgContexts } from "@3sixty/standards-schema-org";

/**
 * Helper class for the public data of an account or organization, the paths of its data that are
 * public. The first segment of a path is an account data type, any further segments a nested
 * property of its value, such as logo, profile.address or profile.address.addressLocality.
 */
export class PublicDataHelper {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<PublicDataHelper>();

	/**
	 * The most paths the public data may hold.
	 */
	public static readonly MAX_PATHS: number = 100;

	/**
	 * The longest path, in characters.
	 */
	public static readonly MAX_PATH_LENGTH: number = 255;

	/**
	 * The format of the first segment of a path, an account data type in kebab case.
	 * @internal
	 */
	private static readonly _TYPE_REGEX: RegExp = /^[a-z0-9]+(-[a-z0-9]+)*$/;

	/**
	 * The format of the further segments of a path, a property name.
	 * @internal
	 */
	private static readonly _PROPERTY_REGEX: RegExp = /^[A-Za-z_][\w-]*$/;

	/**
	 * The property names never followed, so a path can not reach the prototype of an object.
	 * @internal
	 */
	private static readonly _RESERVED_PROPERTIES: string[] = [
		"__proto__",
		"constructor",
		"prototype"
	];

	/**
	 * Check a list of paths.
	 * @param paths The paths.
	 * @returns The paths.
	 * @throws UnprocessableError when the list or a path is not valid.
	 */
	public static validatePaths(paths: unknown): string[] {
		if (
			!Is.array(paths) ||
			paths.length > PublicDataHelper.MAX_PATHS ||
			!paths.every(path => PublicDataHelper.isPath(path))
		) {
			throw new UnprocessableError(PublicDataHelper.CLASS_NAME, "publicDataInvalid");
		}
		return paths as string[];
	}

	/**
	 * Build the value of a public data item.
	 * @param paths The paths, checked first.
	 * @returns The value.
	 * @throws UnprocessableError when a path is not valid.
	 */
	public static createData(paths: string[]): {
		"@context": string;
		"@type": string;
		itemListElement: string[];
	} {
		return {
			"@context": SchemaOrgContexts.Context,
			"@type": "ItemList",
			itemListElement: [...PublicDataHelper.validatePaths(paths)]
		};
	}

	/**
	 * Get the paths of the value of a public data item.
	 * @param data The value.
	 * @param strict True to refuse a value that is not valid, otherwise it holds no paths.
	 * @returns The paths.
	 * @throws UnprocessableError when strict and the value is not valid.
	 */
	public static getPaths(data: unknown, strict?: boolean): string[] {
		const value = Is.object<{ "@type"?: unknown; itemListElement?: unknown }>(data)
			? data
			: undefined;
		try {
			if (value?.["@type"] !== "ItemList") {
				throw new UnprocessableError(PublicDataHelper.CLASS_NAME, "publicDataInvalid");
			}
			return PublicDataHelper.validatePaths(value.itemListElement);
		} catch (error) {
			if (strict === true) {
				throw error;
			}
			return [];
		}
	}

	/**
	 * Build the public JSON-LD objects from the values of the types the paths name. Each type with
	 * data gives one object with the context and type of its value and the properties selected, the
	 * whole value when a path names the type. Paths that do not resolve are skipped.
	 * @param values The values by account data type.
	 * @param paths The paths.
	 * @param identifier The DID of the owner, added to each object that has no identifier.
	 * @returns The objects.
	 */
	public static build(
		values: { [type: string]: unknown },
		paths: string[],
		identifier?: string
	): { [key: string]: unknown }[] {
		const objects: { [key: string]: unknown }[] = [];
		for (const [type, propertyPaths] of PublicDataHelper.groupByType(paths)) {
			const selected = PublicDataHelper.select(values[type], propertyPaths);
			if (Is.object(selected)) {
				if (Is.stringValue(identifier) && Is.undefined(selected.identifier)) {
					selected.identifier = identifier;
				}
				objects.push(selected);
			}
		}
		return objects;
	}

	/**
	 * Check a path.
	 * @param path The path.
	 * @returns True when it is valid.
	 * @internal
	 */
	private static isPath(path: unknown): boolean {
		if (!Is.stringValue(path) || path.length > PublicDataHelper.MAX_PATH_LENGTH) {
			return false;
		}
		const [type, ...properties] = path.split(".");
		return (
			PublicDataHelper._TYPE_REGEX.test(type) &&
			properties.every(
				property =>
					PublicDataHelper._PROPERTY_REGEX.test(property) &&
					!PublicDataHelper._RESERVED_PROPERTIES.includes(property)
			)
		);
	}

	/**
	 * Group paths by their type, in the order the types are first named.
	 * @param paths The paths.
	 * @returns The property paths by type, an empty property path names the whole value.
	 * @internal
	 */
	private static groupByType(paths: string[]): Map<string, string[][]> {
		const groups = new Map<string, string[][]>();
		for (const path of paths) {
			if (PublicDataHelper.isPath(path)) {
				const [type, ...properties] = path.split(".");
				groups.set(type, [...(groups.get(type) ?? []), properties]);
			}
		}
		return groups;
	}

	/**
	 * Select properties of a value.
	 * @param data The value.
	 * @param propertyPaths The property paths, an empty one selects the whole value.
	 * @returns The selected properties, or undefined when the value is not an object or none resolve.
	 * @internal
	 */
	private static select(
		data: unknown,
		propertyPaths: string[][]
	): { [key: string]: unknown } | undefined {
		if (!Is.object<{ [key: string]: unknown }>(data)) {
			return undefined;
		}
		if (propertyPaths.some(propertyPath => propertyPath.length === 0)) {
			return ObjectHelper.omit(ObjectHelper.clone(data), [
				AuthenticationAccountHelper.READ_ONLY_PROPERTY
			]);
		}
		const selected = PublicDataHelper.header(data);
		let found = false;
		for (const propertyPath of propertyPaths) {
			found = PublicDataHelper.copyPath(data, selected, propertyPath) || found;
		}
		return found ? selected : undefined;
	}

	/**
	 * Copy the value at a property path, creating the objects on the way with the type of the
	 * objects they copy.
	 * @param source The object to copy from.
	 * @param target The object to copy to.
	 * @param propertyPath The property path.
	 * @returns True when the path resolved.
	 * @internal
	 */
	private static copyPath(
		source: { [key: string]: unknown },
		target: { [key: string]: unknown },
		propertyPath: string[]
	): boolean {
		// The path is resolved first, so a path that does not resolve leaves the target as it is.
		let resolved: unknown = source;
		for (const key of propertyPath) {
			resolved =
				Is.object<{ [key: string]: unknown }>(resolved) && Object.hasOwn(resolved, key)
					? resolved[key]
					: undefined;
		}
		if (Is.undefined(resolved)) {
			return false;
		}

		let from = source;
		let to = target;
		for (let i = 0; i < propertyPath.length; i++) {
			const key = propertyPath[i];
			const value = Object.hasOwn(from, key) ? from[key] : undefined;
			if (i === propertyPath.length - 1) {
				if (Is.undefined(value)) {
					return false;
				}
				to[key] = ObjectHelper.clone(value);
				return true;
			}
			if (!Is.object<{ [key: string]: unknown }>(value)) {
				return false;
			}
			const existing = to[key];
			const next = Is.object<{ [key: string]: unknown }>(existing)
				? existing
				: PublicDataHelper.header(value, true);
			to[key] = next;
			from = value;
			to = next;
		}
		return false;
	}

	/**
	 * Start an object with the context and type of a value.
	 * @param data The value.
	 * @param typeOnly True to keep only the type, for a nested object.
	 * @returns The object.
	 * @internal
	 */
	private static header(
		data: { [key: string]: unknown },
		typeOnly?: boolean
	): { [key: string]: unknown } {
		const header: { [key: string]: unknown } = {};
		if (typeOnly !== true && !Is.undefined(data["@context"])) {
			header["@context"] = ObjectHelper.clone(data["@context"]);
		}
		if (!Is.undefined(data["@type"])) {
			header["@type"] = ObjectHelper.clone(data["@type"]);
		}
		return header;
	}
}
