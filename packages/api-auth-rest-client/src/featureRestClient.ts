// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type { IFeature, IFeatureComponent, IFeatureListResponse } from "@3sixty/api-auth-models";
import { BaseRestClient } from "@3sixty/api-core";
import type { IBaseRestClientConfig, INoContentRequest } from "@3sixty/api-models";
import { nameof } from "@3sixty/nameof";
import { HttpMethod } from "@3sixty/web";

/**
 * The client to connect to the feature service.
 */
export class FeatureRestClient extends BaseRestClient implements IFeatureComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<FeatureRestClient>();

	/**
	 * Create a new instance of FeatureRestClient.
	 * @param config The configuration for the client.
	 */
	constructor(config: IBaseRestClientConfig) {
		super(nameof<FeatureRestClient>(), config, "features");
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return FeatureRestClient.CLASS_NAME;
	}

	/**
	 * List the features the signed in account can use.
	 * @returns The features.
	 */
	public async list(): Promise<IFeature[]> {
		const response = await this.fetch<INoContentRequest, IFeatureListResponse>("/", HttpMethod.GET);

		return response.body.features;
	}
}
