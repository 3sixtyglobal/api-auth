// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import {
	FeatureAuthorization,
	FeatureFactory,
	type IFeature,
	type IFeatureComponent
} from "@3sixty/api-auth-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import { ContextIdKeys, ContextIdStore } from "@3sixty/context";
import { ComponentFactory, Is } from "@3sixty/core";
import { nameof } from "@3sixty/nameof";
import type { IFeatureServiceConstructorOptions } from "../models/IFeatureServiceConstructorOptions.js";

/**
 * Lists the features registered with the feature factory that the signed in account can use.
 */
export class FeatureService implements IFeatureComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<FeatureService>();

	/**
	 * The default authorization model ID the roles are given in.
	 */
	public static readonly DEFAULT_AUTHORIZATION_MODEL_ID: string = "system";

	/**
	 * The authorization model ID the roles are given in.
	 * @internal
	 */
	private readonly _authorizationModelId: string;

	/**
	 * The authorization component that holds the roles of the accounts.
	 * @internal
	 */
	private readonly _authorizationComponent: IAuthorizationComponent;

	/**
	 * Create a new instance of FeatureService.
	 * @param options The options for the service.
	 */
	constructor(options?: IFeatureServiceConstructorOptions) {
		this._authorizationModelId =
			options?.config?.authorizationModelId ?? FeatureService.DEFAULT_AUTHORIZATION_MODEL_ID;
		this._authorizationComponent = ComponentFactory.get<IAuthorizationComponent>(
			options?.authorizationComponentType ?? "authorization"
		);
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return FeatureService.CLASS_NAME;
	}

	/**
	 * List the features the signed in account can use, from those registered with the feature factory.
	 * @returns The features the authorization component lets the account use, without their roles.
	 */
	public async list(): Promise<IFeature[]> {
		const contextIds = await ContextIdStore.getContextIds();
		const accountId = contextIds?.[ContextIdKeys.Account];
		const names = FeatureFactory.names();
		if (!Is.stringValue(accountId) || names.length === 0) {
			return [];
		}

		const features: IFeature[] = [];
		for (const name of names) {
			const feature = FeatureFactory.get(name);
			if (
				await this._authorizationComponent.check(
					this._authorizationModelId,
					accountId,
					`${FeatureAuthorization.ObjectPrefix}${feature.name}`,
					FeatureAuthorization.Action
				)
			) {
				features.push({ name: feature.name, config: feature.config });
			}
		}

		return features;
	}
}
