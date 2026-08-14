// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import type { IComponent } from "@twin.org/core";
import type { IAuthenticationRateActionConfig } from "./IAuthenticationRateActionConfig.js";

/**
 * Contract definition for authentication rate component.
 */
export interface IAuthenticationRateComponent extends IComponent {
	/**
	 * The service needs to be started when the application is initialized.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the service has been started.
	 */
	start(nodeLoggingComponentType?: string): Promise<void>;

	/**
	 * The component needs to be stopped when the node is closed.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when the service has been stopped.
	 */
	stop(nodeLoggingComponentType?: string): Promise<void>;

	/**
	 * Register or update rate-limit configuration for an action.
	 * @param action The action name.
	 * @param config The action configuration.
	 * @returns A promise that resolves when the action configuration has been stored.
	 */
	registerAction(action: string, config: IAuthenticationRateActionConfig): Promise<void>;

	/**
	 * Unregister rate-limit configuration for an action.
	 * @param action The action name.
	 * @returns A promise that resolves when the action configuration has been removed.
	 */
	unregisterAction(action: string): Promise<void>;

	/**
	 * Check the authentication rate for a given action and identifier.
	 * @param action The action to be checked.
	 * @param identifier The identifier to be checked.
	 * @returns The result of the rate check.
	 */
	check(action: string, identifier: string): Promise<string>;

	/**
	 * Clear the authentication rate entry for the given action and identifier.
	 * @param action The action to clear.
	 * @param identifier The identifier to clear.
	 * @returns A promise that resolves when the rate entry has been removed.
	 */
	clear(action: string, identifier: string): Promise<void>;
}
