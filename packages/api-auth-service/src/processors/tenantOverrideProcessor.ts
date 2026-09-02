// Copyright 2026 IOTA Stiftung.
// SPDX-License-Identifier: Apache-2.0.
import {
	ForbiddenError,
	HttpContextIdKeys,
	HttpErrorHelper,
	type IBaseRoute,
	type IBaseRouteProcessor,
	type IHttpResponse,
	type IHttpServerRequest,
	type ITenantAdminComponent
} from "@twin.org/api-models";
import type { IAuthorizationComponent } from "@twin.org/authorization-models";
import { ContextIdKeys, type IContextIds } from "@twin.org/context";
import { BaseError, ComponentFactory, Is, NotFoundError } from "@twin.org/core";
import { nameof } from "@twin.org/nameof";
import { HttpStatusCode } from "@twin.org/web";
import type { ITenantOverrideProcessorConstructorOptions } from "../models/ITenantOverrideProcessorConstructorOptions.js";

/**
 * Processes the overrideTenant query parameter for routes that allow tenant override.
 * Requires the caller to hold the escalated privilege role. Runs after AuthHeaderProcessor so
 * authentication is always resolved in the caller's own partition first.
 */
export class TenantOverrideProcessor implements IBaseRouteProcessor {
	/**
	 * The query parameter name used to supply the override tenant ID.
	 */
	public static readonly OVERRIDE_TENANT_PARAM: string = "override-tenant";

	/**
	 * The model identifier that is reserved for system-only use.
	 */
	public static readonly DEFAULT_AUTHORIZATION_MODEL_ID: string = "system";

	/**
	 * The role string required to perform a tenant override.
	 */
	public static readonly DEFAULT_ESCALATED_PRIVILEGE_ROLE: string = "global-admin";

	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<TenantOverrideProcessor>();

	/**
	 * The entity storage for api keys.
	 * @internal
	 */
	private readonly _tenantAdminComponent: ITenantAdminComponent;

	/**
	 * The authorization component for checking authorization roles.
	 * @internal
	 */
	private readonly _authorizationComponent: IAuthorizationComponent;

	/**
	 * Include the stack with errors.
	 * @internal
	 */
	private readonly _includeErrorStack: boolean;

	/**
	 * The role value that grants cross-tenant access.
	 * @internal
	 */
	private readonly _escalatedPrivilegeRole: string;

	/**
	 * The authorization model ID to use for REST requests.
	 * @internal
	 */
	private readonly _authorizationModelId: string;

	/**
	 * Create a new instance of TenantOverrideProcessor.
	 * @param options Options for the processor.
	 */
	constructor(options?: ITenantOverrideProcessorConstructorOptions) {
		this._tenantAdminComponent = ComponentFactory.get<ITenantAdminComponent>(
			options?.tenantAdminComponentType ?? "tenant-admin"
		);
		this._authorizationComponent = ComponentFactory.get(
			options?.authorizationComponentType ?? "authorization"
		);
		this._includeErrorStack = options?.config?.includeErrorStack ?? false;
		this._escalatedPrivilegeRole =
			options?.config?.escalatedPrivilegeRole ??
			TenantOverrideProcessor.DEFAULT_ESCALATED_PRIVILEGE_ROLE;
		this._authorizationModelId =
			options?.config?.authorizationModelId ??
			TenantOverrideProcessor.DEFAULT_AUTHORIZATION_MODEL_ID;
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return TenantOverrideProcessor.CLASS_NAME;
	}

	/**
	 * Pre process the REST request for the specified route.
	 * @param request The incoming request.
	 * @param response The outgoing response.
	 * @param route The route to process.
	 * @param contextIds The context IDs of the request.
	 * @param processorState The state handed through the processors.
	 * @returns A promise that resolves when the tenant override has been applied or skipped.
	 */
	public async pre(
		request: IHttpServerRequest,
		response: IHttpResponse,
		route: IBaseRoute | undefined,
		contextIds: IContextIds,
		processorState: { [id: string]: unknown }
	): Promise<void> {
		if (Is.empty(route) || (route.disableTenantOverride ?? false)) {
			return;
		}

		const overrideTenantParam = request.query?.[TenantOverrideProcessor.OVERRIDE_TENANT_PARAM];
		if (!Is.stringValue(overrideTenantParam)) {
			return;
		}

		// If a prior processor already set an error response, skip processing.
		if (Is.notEmpty(response.statusCode) && response.statusCode >= HttpStatusCode.badRequest) {
			return;
		}

		try {
			const userId = contextIds[ContextIdKeys.User];
			if (!Is.stringValue(userId)) {
				throw new ForbiddenError(
					TenantOverrideProcessor.CLASS_NAME,
					"missingUserIdForTenantOverride"
				);
			}

			// Role must be directly assigned to the user, not inherited through a group or other means.
			const hasRole = await this._authorizationComponent.hasRoleForSubject(
				this._authorizationModelId,
				userId,
				this._escalatedPrivilegeRole
			);

			// Caller must hold the escalated privilege role.
			if (!hasRole) {
				throw new ForbiddenError(
					TenantOverrideProcessor.CLASS_NAME,
					"insufficientRoleForTenantOverride"
				);
			}

			// Verify the tenant exists before substituting.
			const tenant = await this._tenantAdminComponent.get(overrideTenantParam);
			if (tenant?.id !== overrideTenantParam) {
				throw new NotFoundError(
					TenantOverrideProcessor.CLASS_NAME,
					"tenantNotFound",
					overrideTenantParam
				);
			}

			contextIds[HttpContextIdKeys.OriginalTenant] = contextIds[ContextIdKeys.Tenant];
			contextIds[ContextIdKeys.Tenant] = overrideTenantParam;
		} catch (err) {
			const error = BaseError.fromError(err);
			const { httpStatusCode } = HttpErrorHelper.processError(error);
			HttpErrorHelper.buildResponse(response, error, httpStatusCode, this._includeErrorStack);
		}
	}
}
