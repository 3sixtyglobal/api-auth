// Copyright 2024 IOTA Stiftung.
// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import type {
	IAuthenticationAccountSummary,
	IAuthenticationComponent,
	IAuthenticationRegistration,
	IAuthorizationCodeRequest,
	IAuthorizationServerMetadata,
	ILoginResult,
	IOAuthAccessToken,
	IPasswordHashOptions,
	IPasswordOptions
} from "@3sixty/api-auth-entity-storage-models";
import {
	AuthorizationServerMetadataField,
	OAuthParameter
} from "@3sixty/api-auth-entity-storage-models";
import type {
	AuthenticationProviderType,
	IAuthenticationAccountAdminComponent,
	IAuthenticationAccountComponent,
	IAuthenticationProvider,
	IAuthenticationProviderDetails,
	IAuthenticationProviderIdentity,
	IAuthenticationRateActionConfig,
	IAuthenticationRateComponent,
	IAuthenticationAuditComponent,
	IOrganizationRequestAdminComponent
} from "@3sixty/api-auth-models";
import {
	AuthAuditEvent,
	AuthenticationAccountDataType,
	AuthenticationAccountHelper,
	AuthenticationProviderFactory,
	EmailHelper,
	RecentSignInHelper
} from "@3sixty/api-auth-models";
import {
	ForbiddenError,
	HttpContextIdKeys,
	HttpUrlHelper,
	type IPlatformComponent,
	type ITenantAdminComponent
} from "@3sixty/api-models";
import type { IAuthorizationComponent } from "@3sixty/authorization-models";
import type { ITaskSchedulerComponent } from "@3sixty/background-task-models";
import { ContextIdHelper, ContextIdKeys, ContextIdStore, type IContextIds } from "@3sixty/context";
import {
	BaseError,
	Coerce,
	ComponentFactory,
	Converter,
	DurationConstants,
	GeneralError,
	Guards,
	Is,
	Mutex,
	NotFoundError,
	ObjectHelper,
	RandomHelper,
	StringHelper,
	UnauthorizedError,
	UnprocessableError
} from "@3sixty/core";
import { PasswordValidator, Sha256 } from "@3sixty/crypto";
import { ComparisonOperator } from "@3sixty/entity";
import {
	EntityStorageConnectorFactory,
	type IEntityStorageConnector
} from "@3sixty/entity-storage-models";
import type { ILoggingComponent } from "@3sixty/logging-models";
import type { IMessagingComponent } from "@3sixty/messaging-models";
import { nameof } from "@3sixty/nameof";
import { VaultConnectorFactory, type IVaultConnector } from "@3sixty/vault-models";
import { EntityStorageAuthenticationAdminService } from "./entityStorageAuthenticationAdminService.js";
import type { AuthenticationAuthorizationCode } from "../entities/authenticationAuthorizationCode.js";
import type { AuthenticationPasswordReset } from "../entities/authenticationPasswordReset.js";
import type { AuthenticationUser } from "../entities/authenticationUser.js";
import type { IEntityStorageAuthenticationServiceConstructorOptions } from "../models/IEntityStorageAuthenticationServiceConstructorOptions.js";
import { AccountHelper } from "../utils/accountHelper.js";
import { AuthorizationCodeHelper } from "../utils/authorizationCodeHelper.js";
import { PasswordHelper } from "../utils/passwordHelper.js";
import { PasswordResetHelper } from "../utils/passwordResetHelper.js";
import { TokenHelper } from "../utils/tokenHelper.js";

/**
 * Implementation of the authentication component using entity storage.
 */
export class EntityStorageAuthenticationService implements IAuthenticationComponent {
	/**
	 * Runtime name for the class.
	 */
	public static readonly CLASS_NAME: string = nameof<EntityStorageAuthenticationService>();

	/**
	 * The default roles given to accounts created by a provider login or a sign up.
	 */
	public static readonly DEFAULT_ROLES: string[] = ["user"];

	/**
	 * The default authorization model ID the roles are given in.
	 */
	public static readonly DEFAULT_AUTHORIZATION_MODEL_ID: string = "system";

	/**
	 * The default time a password reset link can be used for, in minutes.
	 */
	public static readonly DEFAULT_PASSWORD_RESET_EXPIRY_MINUTES: number = 30;

	/**
	 * The default time an authorization code can be used for, in seconds.
	 */
	public static readonly DEFAULT_AUTHORIZATION_CODE_EXPIRY_SECONDS: number = 60;

	/**
	 * The only PKCE code challenge method accepted.
	 */
	public static readonly CODE_CHALLENGE_METHOD: string = "S256";

	/**
	 * The default path of the token endpoint on the node's public origin.
	 */
	public static readonly DEFAULT_TOKEN_ENDPOINT_PATH: string = "authentication/token";

	/**
	 * The default template of the password reset e-mail.
	 */
	public static readonly DEFAULT_PASSWORD_RESET_EMAIL_TEMPLATE_ID: string = "password-reset";

	/**
	 * The default locale of the password reset and sign up e-mails.
	 */
	public static readonly DEFAULT_EMAIL_LOCALE: string = "en";

	/**
	 * The default time a sign up verification link can be used for, in minutes.
	 */
	public static readonly DEFAULT_REGISTRATION_VERIFICATION_EXPIRY_MINUTES: number =
		DurationConstants.MinutesPerDay;

	/**
	 * The default template of the sign up verification e-mail.
	 */
	public static readonly DEFAULT_REGISTRATION_VERIFICATION_EMAIL_TEMPLATE_ID: string =
		"registration-verify";

	/**
	 * The default template of the e-mail sent when a sign up uses an address that has an account.
	 */
	public static readonly DEFAULT_REGISTRATION_EXISTS_EMAIL_TEMPLATE_ID: string =
		"registration-exists";

	/**
	 * The minimum password length applied when none is configured, as the password validator applies.
	 */
	public static readonly DEFAULT_MIN_PASSWORD_LENGTH: number = 15;

	/**
	 * The maximum password length applied when none is configured, as the password validator applies.
	 */
	public static readonly DEFAULT_MAX_PASSWORD_LENGTH: number = 128;

	/**
	 * The default role that grants escalated privilege.
	 */
	public static readonly DEFAULT_ESCALATED_PRIVILEGE_ROLE: string = "global-admin";

	/**
	 * The rate limit action for logins per e-mail address and client.
	 */
	public static readonly RATE_ACTION_LOGIN: string = "login";

	/**
	 * The rate limit action for logins per client.
	 */
	public static readonly RATE_ACTION_LOGIN_CLIENT: string = "login-client";

	/**
	 * The rate limit action for logins per e-mail address from every client.
	 */
	public static readonly RATE_ACTION_LOGIN_ACCOUNT: string = "login-account";

	/**
	 * The rate limit action for logins through a provider, per client or per provider account.
	 */
	public static readonly RATE_ACTION_LOGIN_PROVIDER: string = "login-provider";

	/**
	 * The rate limit action for refreshing the token of a session.
	 */
	public static readonly RATE_ACTION_TOKEN_REFRESH: string = "token-refresh";

	/**
	 * The rate limit action for verifying a sign up.
	 */
	public static readonly RATE_ACTION_REGISTER_VERIFY: string = "register-verify";

	/**
	 * The rate limit action for asking for a password reset link.
	 */
	public static readonly RATE_ACTION_PASSWORD_FORGOT: string = "password-forgot";

	/**
	 * The rate limit action for resetting a password with a reset link.
	 */
	public static readonly RATE_ACTION_PASSWORD_RESET: string = "password-reset";

	/**
	 * The default interval of the removal of expired sign ups and tokens, in minutes.
	 */
	public static readonly DEFAULT_CLEANUP_INTERVAL_MINUTES: number = 60;

	/**
	 * The default delivery interval of the queued e-mails, in seconds.
	 */
	public static readonly DEFAULT_DELIVERY_INTERVAL_SECONDS: number = 60;

	/**
	 * Default TTL in minutes.
	 * @internal
	 */
	private static readonly _DEFAULT_TTL_MINUTES: number = 60;

	/**
	 * The default rate limits for each action.
	 * @internal
	 */
	private static readonly _DEFAULT_RATE_LIMITS: {
		[action: string]: IAuthenticationRateActionConfig;
	} = {
		login: { maxAttempts: 5, windowMinutes: 15 },
		"login-client": { maxAttempts: 20, windowMinutes: 15 },
		"login-account": { maxAttempts: 50, windowMinutes: 60 },
		"password-change": { maxAttempts: 5, windowMinutes: 15 },
		"token-refresh": { maxAttempts: 30, windowMinutes: 60 },
		"login-provider": { maxAttempts: 20, windowMinutes: 15 },
		register: { maxAttempts: 5, windowMinutes: 60 },
		"register-verify": { maxAttempts: 10, windowMinutes: 15 },
		"password-forgot": { maxAttempts: 5, windowMinutes: 60 },
		"password-reset": { maxAttempts: 10, windowMinutes: 15 }
	};

	/**
	 * The audit service.
	 * @internal
	 */
	private readonly _authenticationAuditService: IAuthenticationAuditComponent;

	/**
	 * The rate service.
	 * @internal
	 */
	private readonly _authenticationRateService: IAuthenticationRateComponent;

	/**
	 * The entity storage for users.
	 * @internal
	 */
	private readonly _userEntityStorage: IEntityStorageConnector<AuthenticationUser>;

	/**
	 * The entity storage for password reset and sign up verification tokens.
	 * @internal
	 */
	private readonly _passwordResetEntityStorage: IEntityStorageConnector<AuthenticationPasswordReset>;

	/**
	 * The entity storage for the authorization codes.
	 * @internal
	 */
	private readonly _authorizationCodeEntityStorage: IEntityStorageConnector<AuthenticationAuthorizationCode>;

	/**
	 * The vault for the keys.
	 * @internal
	 */
	private readonly _vaultConnector: IVaultConnector;

	/**
	 * The task scheduler that runs the deliveries and the cleanup.
	 * @internal
	 */
	private readonly _taskScheduler: ITaskSchedulerComponent;

	/**
	 * The id of the scheduler task that runs the deliveries.
	 * @internal
	 */
	private readonly _deliveryTaskId: string;

	/**
	 * The deliveries waiting to run after the responses that queued them.
	 * @internal
	 */
	private readonly _deliveryJobs: { contextIds?: IContextIds; method: () => Promise<void> }[];

	/**
	 * The delivery interval of the queued e-mails, in seconds.
	 * @internal
	 */
	private readonly _deliveryIntervalSeconds: number;

	/**
	 * The id of the scheduler task that removes expired sign ups and tokens.
	 * @internal
	 */
	private readonly _cleanupTaskId: string;

	/**
	 * The interval of the removal of expired sign ups and tokens, in minutes.
	 * @internal
	 */
	private readonly _cleanupIntervalMinutes: number;

	/**
	 * The platform component that runs the cleanup in every tenant.
	 * @internal
	 */
	private readonly _platformComponent: IPlatformComponent;

	/**
	 * The name of the key to retrieve from the vault for signing JWT.
	 * @internal
	 */
	private readonly _signingKeyName: string;

	/**
	 * The default TTL for the token.
	 * @internal
	 */
	private readonly _defaultTtlMinutes: number;

	/**
	 * The longest a session may last, in minutes, unlimited when not set.
	 * @internal
	 */
	private readonly _maxSessionMinutes?: number;

	/**
	 * True to limit logins per client and per e-mail address with the client.
	 * @internal
	 */
	private readonly _loginRateLimitPerClient: boolean;

	/**
	 * True to rate limit by the client address.
	 * @internal
	 */
	private readonly _clientAddressRateLimitEnabled: boolean;

	/**
	 * The minimum password length for validation.
	 * @internal
	 */
	private readonly _minPasswordLength?: number;

	/**
	 * The maximum password length for validation.
	 * @internal
	 */
	private readonly _maxPasswordLength?: number;

	/**
	 * The Argon2id parameters for new passwords.
	 * @internal
	 */
	private readonly _passwordHashOptions?: IPasswordHashOptions;

	/**
	 * The rate limits for each action.
	 * @internal
	 */
	private readonly _rateLimits: { [action: string]: IAuthenticationRateActionConfig };

	/**
	 * The address of the page that resets the password, the token is added as a query parameter.
	 * @internal
	 */
	private readonly _passwordResetUrl: string;

	/**
	 * How long a password reset link can be used for, in minutes.
	 * @internal
	 */
	private readonly _passwordResetExpiryMinutes: number;

	/**
	 * How long an authorization code can be used for, in seconds.
	 * @internal
	 */
	private readonly _authorizationCodeExpirySeconds: number;

	/**
	 * The redirect addresses, besides those on the public origin, a code may be sent to.
	 * @internal
	 */
	private readonly _authorizationRedirectUris: string[];

	/**
	 * The login page given as the authorization endpoint in the metadata.
	 * @internal
	 */
	private readonly _authorizationEndpoint?: string;

	/**
	 * The path of the token endpoint on the public origin.
	 * @internal
	 */
	private readonly _tokenEndpointPath: string;

	/**
	 * The sender of the password reset and sign up e-mails.
	 * @internal
	 */
	private readonly _emailSender: string;

	/**
	 * The values given to every e-mail template, such as the company name.
	 * @internal
	 */
	private readonly _emailTemplateData: { [key: string]: string };

	/**
	 * The template of the password reset e-mail.
	 * @internal
	 */
	private readonly _passwordResetEmailTemplateId: string;

	/**
	 * The locale of the password reset and sign up e-mails.
	 * @internal
	 */
	private readonly _emailLocale: string;

	/**
	 * The address of the page that verifies a sign up.
	 * @internal
	 */
	private readonly _registrationVerificationUrl: string;

	/**
	 * How long a sign up verification link can be used for, in minutes.
	 * @internal
	 */
	private readonly _registrationVerificationExpiryMinutes: number;

	/**
	 * The template of the sign up verification e-mail.
	 * @internal
	 */
	private readonly _registrationVerificationEmailTemplateId: string;

	/**
	 * The template of the e-mail sent when a sign up uses an address that has an account.
	 * @internal
	 */
	private readonly _registrationExistsEmailTemplateId: string;

	/**
	 * The messaging component that sends the password reset and sign up e-mails.
	 * @internal
	 */
	private readonly _messagingComponent: IMessagingComponent;

	/**
	 * The logging component, when it exists.
	 * @internal
	 */
	private readonly _logging?: ILoggingComponent;

	/**
	 * The organization request admin component, which removes the requests of a removed account.
	 * @internal
	 */
	private readonly _organizationRequestAdmin: IOrganizationRequestAdminComponent;

	/**
	 * The roles given to accounts created by a provider login or a sign up.
	 * @internal
	 */
	private readonly _defaultRoles: string[];

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
	 * The component to retrieve tenant information.
	 * @internal
	 */
	private readonly _tenantAdminComponent?: ITenantAdminComponent;

	/**
	 * The account data admin component, which stores the profile a provider holds.
	 * @internal
	 */
	private readonly _authenticationAccountAdmin: IAuthenticationAccountAdminComponent;

	/**
	 * The account data component, which removes the identity of a removed account.
	 * @internal
	 */
	private readonly _authenticationAccount: IAuthenticationAccountComponent;

	/**
	 * How long ago the session may have started for removing the account, in seconds.
	 * @internal
	 */
	private readonly _recentSignInSeconds: number;

	/**
	 * The node identity.
	 * @internal
	 */
	private _nodeId?: string;

	/**
	 * Create a new instance of EntityStorageAuthentication.
	 * @param options The dependencies for the identity connector.
	 * @throws GeneralError when the default roles include the escalated privilege role.
	 */
	constructor(options?: IEntityStorageAuthenticationServiceConstructorOptions) {
		this._userEntityStorage = EntityStorageConnectorFactory.get(
			options?.userEntityStorageType ?? "authentication-user"
		);

		this._passwordResetEntityStorage = EntityStorageConnectorFactory.get(
			options?.passwordResetEntityStorageType ?? "authentication-password-reset"
		);

		this._authorizationCodeEntityStorage = EntityStorageConnectorFactory.get(
			options?.authorizationCodeEntityStorageType ?? "authentication-authorization-code"
		);

		this._vaultConnector = VaultConnectorFactory.get(options?.vaultConnectorType ?? "vault");

		this._authenticationAuditService = ComponentFactory.get<IAuthenticationAuditComponent>(
			options?.authenticationAuditServiceType ?? "authentication-audit"
		);

		this._authenticationRateService = ComponentFactory.get<IAuthenticationRateComponent>(
			options?.authenticationRateServiceType ?? "authentication-rate"
		);

		this._tenantAdminComponent = ComponentFactory.getIfExists<ITenantAdminComponent>(
			options?.tenantAdminComponentType ?? "tenant-admin"
		);

		this._taskScheduler = ComponentFactory.get<ITaskSchedulerComponent>(
			options?.taskSchedulerComponentType ?? "task-scheduler"
		);
		this._deliveryTaskId = `authentication-delivery-${RandomHelper.generateUuidV7()}`;
		this._deliveryJobs = [];
		this._cleanupTaskId = `authentication-cleanup-${RandomHelper.generateUuidV7()}`;
		this._platformComponent = ComponentFactory.get<IPlatformComponent>(
			options?.platformComponentType ?? "platform"
		);

		this._authenticationAccountAdmin = ComponentFactory.get<IAuthenticationAccountAdminComponent>(
			options?.authenticationAccountAdminComponentType ?? "authentication-account-admin"
		);
		this._authenticationAccount = ComponentFactory.get<IAuthenticationAccountComponent>(
			options?.authenticationAccountComponentType ?? "authentication-account"
		);
		this._authorizationComponent = ComponentFactory.get<IAuthorizationComponent>(
			options?.authorizationComponentType ?? "authorization"
		);
		this._logging = ComponentFactory.getIfExists<ILoggingComponent>(
			options?.loggingComponentType ?? "logging"
		);
		this._organizationRequestAdmin = ComponentFactory.get<IOrganizationRequestAdminComponent>(
			options?.organizationRequestAdminComponentType ?? "organization-request-admin"
		);

		const config = options?.config;
		this._signingKeyName = config?.signingKeyName ?? "auth-signing";
		this._defaultTtlMinutes =
			config?.defaultTtlMinutes ?? EntityStorageAuthenticationService._DEFAULT_TTL_MINUTES;
		this._maxSessionMinutes = config?.maxSessionMinutes;
		this._recentSignInSeconds =
			config?.recentSignInSeconds ?? RecentSignInHelper.DEFAULT_MAX_AGE_SECONDS;
		this._loginRateLimitPerClient = config?.loginRateLimitPerClient ?? false;
		this._clientAddressRateLimitEnabled = config?.clientAddressRateLimitEnabled ?? false;
		this._minPasswordLength = config?.minPasswordLength;
		this._maxPasswordLength = config?.maxPasswordLength;
		this._passwordHashOptions = config?.passwordHashOptions;
		this._cleanupIntervalMinutes =
			config?.cleanupIntervalMinutes ??
			EntityStorageAuthenticationService.DEFAULT_CLEANUP_INTERVAL_MINUTES;
		this._deliveryIntervalSeconds =
			config?.deliveryIntervalSeconds ??
			EntityStorageAuthenticationService.DEFAULT_DELIVERY_INTERVAL_SECONDS;

		const configured: { [action: string]: IAuthenticationRateActionConfig | undefined } = {
			login: config?.loginRateLimit,
			"login-client": config?.loginClientRateLimit,
			"login-account": config?.loginAccountRateLimit,
			"password-change": config?.passwordChangeRateLimit,
			"token-refresh": config?.tokenRefreshRateLimit,
			"login-provider": config?.loginProviderRateLimit,
			register: config?.registerRateLimit,
			"register-verify": config?.registerVerifyRateLimit,
			"password-forgot": config?.passwordForgotRateLimit,
			"password-reset": config?.passwordResetRateLimit
		};
		this._rateLimits = {};
		for (const [action, defaults] of Object.entries(
			EntityStorageAuthenticationService._DEFAULT_RATE_LIMITS
		)) {
			this._rateLimits[action] = {
				maxAttempts: configured[action]?.maxAttempts ?? defaults.maxAttempts,
				windowMinutes: configured[action]?.windowMinutes ?? defaults.windowMinutes
			};
		}

		// Reset and verification links are sent by e-mail, so fail at start when they cannot be.
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(config?.passwordResetUrl),
			config?.passwordResetUrl
		);
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(config?.registrationVerificationUrl),
			config?.registrationVerificationUrl
		);
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(config?.emailSender),
			config?.emailSender
		);
		this._messagingComponent = ComponentFactory.get<IMessagingComponent>(
			options?.messagingComponentType ?? "messaging"
		);

		this._passwordResetUrl = config.passwordResetUrl;
		this._passwordResetExpiryMinutes =
			config?.passwordResetExpiryMinutes ??
			EntityStorageAuthenticationService.DEFAULT_PASSWORD_RESET_EXPIRY_MINUTES;
		this._authorizationCodeExpirySeconds =
			config?.authorizationCodeExpirySeconds ??
			EntityStorageAuthenticationService.DEFAULT_AUTHORIZATION_CODE_EXPIRY_SECONDS;
		this._authorizationRedirectUris = config?.authorizationRedirectUris ?? [];
		this._authorizationEndpoint = config?.authorizationEndpoint;
		this._tokenEndpointPath =
			config?.tokenEndpointPath ?? EntityStorageAuthenticationService.DEFAULT_TOKEN_ENDPOINT_PATH;
		this._emailSender = config.emailSender;
		// Always given, so a template never shows an unfilled placeholder.
		this._emailTemplateData = {
			companyName: config?.emailCompanyName ?? ""
		};
		this._passwordResetEmailTemplateId =
			config?.passwordResetEmailTemplateId ??
			EntityStorageAuthenticationService.DEFAULT_PASSWORD_RESET_EMAIL_TEMPLATE_ID;
		this._emailLocale =
			config?.emailLocale ?? EntityStorageAuthenticationService.DEFAULT_EMAIL_LOCALE;

		this._registrationVerificationUrl = config.registrationVerificationUrl;
		this._registrationVerificationExpiryMinutes =
			config?.registrationVerificationExpiryMinutes ??
			EntityStorageAuthenticationService.DEFAULT_REGISTRATION_VERIFICATION_EXPIRY_MINUTES;
		this._registrationVerificationEmailTemplateId =
			config?.registrationVerificationEmailTemplateId ??
			EntityStorageAuthenticationService.DEFAULT_REGISTRATION_VERIFICATION_EMAIL_TEMPLATE_ID;
		this._registrationExistsEmailTemplateId =
			config?.registrationExistsEmailTemplateId ??
			EntityStorageAuthenticationService.DEFAULT_REGISTRATION_EXISTS_EMAIL_TEMPLATE_ID;

		this._defaultRoles = config?.defaultRoles ?? EntityStorageAuthenticationService.DEFAULT_ROLES;
		this._authorizationModelId =
			config?.authorizationModelId ??
			EntityStorageAuthenticationService.DEFAULT_AUTHORIZATION_MODEL_ID;

		// Accounts anyone can create must never be given escalated privilege.
		const escalatedPrivilegeRole =
			config?.escalatedPrivilegeRole ??
			EntityStorageAuthenticationService.DEFAULT_ESCALATED_PRIVILEGE_ROLE;
		if (this._defaultRoles.includes(escalatedPrivilegeRole)) {
			throw new GeneralError(
				EntityStorageAuthenticationService.CLASS_NAME,
				"defaultRolesEscalated",
				{ roleName: escalatedPrivilegeRole }
			);
		}
	}

	/**
	 * Returns the class name of the component.
	 * @returns The class name of the component.
	 */
	public className(): string {
		return EntityStorageAuthenticationService.CLASS_NAME;
	}

	/**
	 * The service needs to be started when the application is initialized.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when rate-limit actions have been registered and the node identity cached.
	 */
	public async start(nodeLoggingComponentType?: string): Promise<void> {
		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Node);
		this._nodeId = contextIds[ContextIdKeys.Node];

		for (const [action, config] of Object.entries(this._rateLimits)) {
			await this._authenticationRateService.registerAction(action, config);
		}

		await this._taskScheduler.addTask(
			this._deliveryTaskId,
			[{ intervalSeconds: this._deliveryIntervalSeconds }],
			async () => this.runDeliveries()
		);

		await this._taskScheduler.addTask(
			this._cleanupTaskId,
			[{ intervalMinutes: this._cleanupIntervalMinutes }],
			async () => this.cleanupExpired()
		);
	}

	/**
	 * The component needs to be stopped when the node is closed.
	 * @param nodeLoggingComponentType The node logging component type.
	 * @returns A promise that resolves when all rate-limit actions have been unregistered.
	 */
	public async stop(nodeLoggingComponentType?: string): Promise<void> {
		await this._taskScheduler.removeTask(this._deliveryTaskId);
		await this._taskScheduler.removeTask(this._cleanupTaskId);
		// Deliveries still waiting are run now so no e-mail is lost.
		await this.runDeliveries();

		for (const action of Object.keys(this._rateLimits)) {
			await this._authenticationRateService.unregisterAction(action);
		}
	}

	/**
	 * Perform a login for the user.
	 * @param email The email address for the user.
	 * @param password The password for the user.
	 * @returns The token, and the profile when the provider holds one.
	 * @throws UnauthorizedError the same way when the account is unknown, disabled, the password does
	 * not match or the e-mail address or client tries too often, and with accountNotVerified when the
	 * password matches an enabled account whose e-mail address is not verified yet.
	 */
	public async login(email: string, password: string): Promise<ILoginResult> {
		Guards.stringValue(EntityStorageAuthenticationService.CLASS_NAME, nameof(email), email);
		Guards.stringValue(EntityStorageAuthenticationService.CLASS_NAME, nameof(password), password);

		if (!Is.stringValue(this._nodeId)) {
			throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "nodeIdNotSet");
		}

		const { user, identity, normalisedEmail, loginKey } = await this.checkPassword(email, password);

		let session: { user: AuthenticationUser; tenantId?: string; token?: string; expiry: number };
		try {
			session = await this.startSession(this._nodeId, user);
		} catch {
			await this._authenticationAuditService.create({
				actorId: normalisedEmail,
				event: AuthAuditEvent.LoginFailure
			});
			throw new UnauthorizedError(EntityStorageAuthenticationService.CLASS_NAME, "loginFailed");
		}

		await Promise.all([
			this.clearPasswordRateLimits(normalisedEmail, loginKey),
			this._authenticationAuditService.create({
				actorId: session.user.email,
				event: AuthAuditEvent.LoginSuccess,
				data: {
					accountId: session.user.accountId,
					tenantId: session.tenantId
				}
			})
		]);

		return {
			accountId: session.user.accountId,
			token: session.token,
			expiry: session.expiry,
			profile: identity.profile,
			profileReadOnly: identity.profileReadOnly ?? false,
			profileEditUrl: identity.profileEditUrl,
			passwordChangeUrl: identity.passwordChangeUrl,
			roles: await this._authorizationComponent.getRolesForSubject(
				this._authorizationModelId,
				session.user.accountId
			)
		};
	}

	/**
	 * Check the e-mail address and password of a password account and issue an OAuth 2.0
	 * authorization code for it, redeemed by the entity storage OAuth provider. The password is
	 * checked and rate limited the same way as a login, the sign in itself is audited when the code
	 * is redeemed.
	 * @param email The email address for the user.
	 * @param password The password for the user.
	 * @param authorization The authorization request the code is issued for.
	 * @returns The address to send the browser to, with the code and state added.
	 * @throws UnprocessableError when the redirect address is not on the node's public origin.
	 * @throws UnauthorizedError the same way as a login.
	 */
	public async authorize(
		email: string,
		password: string,
		authorization: IAuthorizationCodeRequest
	): Promise<string> {
		Guards.stringValue(EntityStorageAuthenticationService.CLASS_NAME, nameof(email), email);
		Guards.stringValue(EntityStorageAuthenticationService.CLASS_NAME, nameof(password), password);
		Guards.object<IAuthorizationCodeRequest>(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(authorization),
			authorization
		);
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(authorization.state),
			authorization.state
		);
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(authorization.nonce),
			authorization.nonce
		);
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(authorization.codeChallenge),
			authorization.codeChallenge
		);
		Guards.arrayOneOf(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(authorization.codeChallengeMethod),
			authorization.codeChallengeMethod,
			[EntityStorageAuthenticationService.CODE_CHALLENGE_METHOD]
		);
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(authorization.redirectUri),
			authorization.redirectUri
		);

		// A code is only sent back to the node, where the callback redeems it with the code verifier,
		// or to a registered redirect address, so a crafted request cannot send the code of an account
		// to another site.
		const contextIds = await ContextIdStore.getContextIds();
		const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];
		const redirect = URL.canParse(authorization.redirectUri)
			? new URL(authorization.redirectUri)
			: undefined;
		const origin =
			Is.stringValue(publicOrigin) && URL.canParse(publicOrigin)
				? new URL(publicOrigin)
				: undefined;
		const onNode =
			Is.object(origin) &&
			redirect?.origin === origin.origin &&
			redirect.pathname.startsWith(`${StringHelper.trimTrailingSlashes(origin.pathname)}/`) &&
			redirect.search.length === 0 &&
			redirect.hash.length === 0;
		if (
			Is.undefined(redirect) ||
			(!onNode && !this._authorizationRedirectUris.includes(authorization.redirectUri))
		) {
			throw new UnprocessableError(
				EntityStorageAuthenticationService.CLASS_NAME,
				"authorizationRedirectInvalid"
			);
		}

		const { user, normalisedEmail, loginKey } = await this.checkPassword(email, password);

		const code = await AuthorizationCodeHelper.create(
			this._authorizationCodeEntityStorage,
			user.accountId,
			authorization,
			this._authorizationCodeExpirySeconds
		);
		await this.clearPasswordRateLimits(normalisedEmail, loginKey);

		redirect.searchParams.set("code", code);
		redirect.searchParams.set("state", authorization.state);
		return redirect.toString();
	}

	/**
	 * Exchange an OAuth 2.0 authorization code issued by authorize for a session of its account, as
	 * the token endpoint does. The code can only be used once, and only with the redirect address and
	 * code verifier it was issued for.
	 * @param code The authorization code.
	 * @param codeVerifier The PKCE code verifier the code challenge was made from.
	 * @param redirectUri The redirect address the code was sent to.
	 * @returns The access token, a session token of the node.
	 * @throws UnauthorizedError when the code is unknown, used, expired or does not match, or the
	 * account can no longer sign in.
	 */
	public async exchangeAuthorizationCode(
		code: string,
		codeVerifier: string,
		redirectUri: string
	): Promise<IOAuthAccessToken> {
		Guards.stringValue(EntityStorageAuthenticationService.CLASS_NAME, nameof(code), code);
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(codeVerifier),
			codeVerifier
		);
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(redirectUri),
			redirectUri
		);

		if (!Is.stringValue(this._nodeId)) {
			throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "nodeIdNotSet");
		}

		let session: { user: AuthenticationUser; tenantId?: string; token?: string; expiry: number };
		try {
			const issued = await AuthorizationCodeHelper.redeem(
				this._authorizationCodeEntityStorage,
				code,
				codeVerifier,
				redirectUri
			);
			const user = Is.object(issued)
				? await this._userEntityStorage.get(issued.accountId)
				: undefined;
			if (
				!Is.object<AuthenticationUser>(user) ||
				user.authProviderId !== EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID
			) {
				throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "userNotFound");
			}
			session = await this.startSession(this._nodeId, user);
			if (!Is.stringValue(session.token)) {
				throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "tokenMissing");
			}
		} catch {
			await this._authenticationAuditService.create({
				actorId: EntityStorageAuthenticationService.CLASS_NAME,
				event: AuthAuditEvent.LoginFailure
			});
			throw new UnauthorizedError(
				EntityStorageAuthenticationService.CLASS_NAME,
				"authorizationCodeInvalid"
			);
		}

		await this._authenticationAuditService.create({
			actorId: session.user.email,
			event: AuthAuditEvent.LoginSuccess,
			data: {
				accountId: session.user.accountId,
				tenantId: session.tenantId
			}
		});

		return {
			[OAuthParameter.AccessToken]: session.token,
			[OAuthParameter.TokenType]: "Bearer",
			[OAuthParameter.ExpiresIn]: Math.max(
				0,
				Math.floor((session.expiry - Date.now()) / DurationConstants.MsPerSecond)
			)
		};
	}

	/**
	 * Get the OAuth 2.0 authorization server metadata of the node, for the public origin of the request.
	 * @returns The metadata.
	 * @throws NotFoundError when no authorization endpoint is configured.
	 */
	public async authorizationServerMetadata(): Promise<IAuthorizationServerMetadata> {
		const contextIds = await ContextIdStore.getContextIds();
		const publicOrigin = contextIds?.[HttpContextIdKeys.PublicOrigin];
		const tokenEndpoint = HttpUrlHelper.combineOriginPath(publicOrigin, this._tokenEndpointPath);
		if (
			!Is.stringValue(this._authorizationEndpoint) ||
			!Is.stringValue(publicOrigin) ||
			!Is.stringValue(tokenEndpoint)
		) {
			throw new NotFoundError(
				EntityStorageAuthenticationService.CLASS_NAME,
				"authorizationServerNotConfigured"
			);
		}

		return {
			[AuthorizationServerMetadataField.Issuer]: StringHelper.trimTrailingSlashes(publicOrigin),
			[AuthorizationServerMetadataField.AuthorizationEndpoint]: this._authorizationEndpoint,
			[AuthorizationServerMetadataField.TokenEndpoint]: tokenEndpoint,
			[AuthorizationServerMetadataField.ResponseTypesSupported]: ["code"],
			[AuthorizationServerMetadataField.GrantTypesSupported]: ["authorization_code"],
			[AuthorizationServerMetadataField.CodeChallengeMethodsSupported]: [
				EntityStorageAuthenticationService.CODE_CHALLENGE_METHOD
			],
			[AuthorizationServerMetadataField.TokenEndpointAuthMethodsSupported]: ["none"]
		};
	}

	/**
	 * Perform a login through an authentication provider, creating the account on the first login
	 * when provider sign up is enabled.
	 * @param authProviderId The authentication provider id, as registered with the authentication provider factory.
	 * @param credentials The provider specific credentials.
	 * @returns The token, and the profile when the provider holds one.
	 */
	public async loginWithProvider(
		authProviderId: string,
		credentials: unknown
	): Promise<ILoginResult> {
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(authProviderId),
			authProviderId
		);

		if (!Is.stringValue(this._nodeId)) {
			throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "nodeIdNotSet");
		}
		// Password logins must go through login so they are rate limited.
		if (authProviderId === EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID) {
			throw new UnauthorizedError(
				EntityStorageAuthenticationService.CLASS_NAME,
				"usePasswordLogin"
			);
		}

		// The client is limited when its address is known, never a bucket shared by every client.
		// Otherwise the account the provider identifies is limited, once the provider has verified it.
		const clientKey = await this.clientRateKey();
		let rateKey = Is.stringValue(clientKey) ? `${authProviderId}|${clientKey}` : undefined;
		if (Is.stringValue(rateKey)) {
			await this._authenticationRateService.check(
				EntityStorageAuthenticationService.RATE_ACTION_LOGIN_PROVIDER,
				rateKey
			);
		}

		let session: { user: AuthenticationUser; tenantId?: string; token?: string; expiry: number };
		let identity: IAuthenticationProviderIdentity;

		try {
			const provider = AuthenticationProviderFactory.get(authProviderId);
			identity = await provider.authenticate(credentials);
			Guards.stringValue(
				EntityStorageAuthenticationService.CLASS_NAME,
				nameof(identity.providerAccountId),
				identity.providerAccountId
			);
			if (!Is.stringValue(rateKey)) {
				rateKey = `${authProviderId}|subject|${identity.providerAccountId}`;
				await this._authenticationRateService.check(
					EntityStorageAuthenticationService.RATE_ACTION_LOGIN_PROVIDER,
					rateKey
				);
			}

			// A provider that signs in an account the node holds, such as a password account through
			// OAuth, gives its id, so the account is read and never created.
			const user = Is.stringValue(identity.accountId)
				? await this._userEntityStorage.get(identity.accountId)
				: await this.findOrCreateProviderAccount(authProviderId, identity);
			if (!Is.object<AuthenticationUser>(user)) {
				throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "userNotFound");
			}
			session = await this.startSession(this._nodeId, user, identity);
			await this.storeProviderProfile(user.accountId, identity);
		} catch {
			await this._authenticationAuditService.create({
				actorId: authProviderId,
				event: AuthAuditEvent.LoginFailure
			});

			throw new UnauthorizedError(EntityStorageAuthenticationService.CLASS_NAME, "loginFailed");
		}

		await Promise.all([
			this._authenticationRateService.clear(
				EntityStorageAuthenticationService.RATE_ACTION_LOGIN_PROVIDER,
				rateKey
			),
			this._authenticationAuditService.create({
				actorId: session.user.email,
				event: AuthAuditEvent.LoginSuccess,
				data: {
					accountId: session.user.accountId,
					authProviderId,
					tenantId: session.tenantId
				}
			})
		]);

		// Kept out of the sign in, a photo that can not be stored never fails it.
		await this.storeProviderAvatar(session.user.accountId, identity);

		return {
			accountId: session.user.accountId,
			token: session.token,
			expiry: session.expiry,
			profile: identity.profile,
			profileReadOnly: identity.profileReadOnly ?? false,
			profileEditUrl: identity.profileEditUrl,
			passwordChangeUrl: identity.passwordChangeUrl,
			roles: await this._authorizationComponent.getRolesForSubject(
				this._authorizationModelId,
				session.user.accountId
			)
		};
	}

	/**
	 * Sign up for a password account, when the password provider is registered. The account is
	 * created unverified and a verification link is sent, or the owner of an address that already
	 * has an account is told, after the response, so the response is the same either way.
	 * @param registration The details of the account.
	 * @returns A promise that resolves when the sign up has been accepted.
	 * @throws ForbiddenError when the password provider is not registered.
	 */
	public async register(registration: IAuthenticationRegistration): Promise<void> {
		Guards.object<IAuthenticationRegistration>(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(registration),
			registration
		);
		Guards.email(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(registration.email),
			registration.email
		);
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(registration.password),
			registration.password
		);

		this.guardPasswordProviderRegistered();
		if (!Is.stringValue(this._nodeId)) {
			throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "nodeIdNotSet");
		}

		const normalised: IAuthenticationRegistration = {
			...registration,
			email: EmailHelper.normalise(registration.email)
		};

		await this._authenticationRateService.check(
			"register",
			(await this.clientRateKey()) ?? normalised.email
		);

		PasswordValidator.validatePassword(normalised.password, {
			minLength: this._minPasswordLength,
			maxLength: this._maxPasswordLength
		});

		// The password is hashed before the work is queued, so the queue never holds it, and for every
		// sign up, so the response takes as long whether or not the address is taken.
		const passwordHash = await PasswordHelper.hashPassword(
			normalised.password,
			this._passwordHashOptions
		);
		const details: Omit<IAuthenticationRegistration, "password"> = {
			email: normalised.email,
			givenName: normalised.givenName,
			familyName: normalised.familyName
		};
		await this.queueDelivery(async () => this.completeRegistration(details, passwordHash));
	}

	/**
	 * Verify the e-mail address of a self sign up with the token from the verification link, giving
	 * the account the default roles so it can sign in.
	 * @param token The token from the verification link.
	 * @returns A promise that resolves when the account has been verified.
	 * @throws ForbiddenError when the password provider is not registered.
	 * @throws UnauthorizedError when the token is unknown, used or expired.
	 * @throws TooManyRequestsError when the client verifies too often.
	 */
	public async verifyRegistration(token: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationService.CLASS_NAME, nameof(token), token);

		this.guardPasswordProviderRegistered();

		await this._authenticationRateService.check(
			EntityStorageAuthenticationService.RATE_ACTION_REGISTER_VERIFY,
			(await this.clientRateKey()) ?? `token-${PasswordResetHelper.hashToken(token)}`
		);

		const reset = await PasswordResetHelper.consume(
			this._passwordResetEntityStorage,
			token,
			PasswordResetHelper.PURPOSE_REGISTRATION
		);
		const accountId = reset?.accountId;
		const user = Is.stringValue(accountId)
			? await this._userEntityStorage.get(accountId)
			: undefined;
		const isVerifiable = (account: AuthenticationUser | undefined): boolean =>
			account?.verified === false &&
			account.accountId === accountId &&
			!AccountHelper.isDisabled(account);
		if (!Is.object<AuthenticationUser>(user) || !isVerifiable(user)) {
			throw new UnauthorizedError(
				EntityStorageAuthenticationService.CLASS_NAME,
				"registrationVerificationInvalid"
			);
		}

		// Written only when the account is unchanged since it was read, so a concurrent disable or
		// removal is kept and the verification refused.
		await AccountHelper.update(this._userEntityStorage, user, current => {
			if (!isVerifiable(current)) {
				throw new UnauthorizedError(
					EntityStorageAuthenticationService.CLASS_NAME,
					"registrationVerificationInvalid"
				);
			}
			// The password is the one given with the sign up the link was sent for, so a sign up made
			// earlier by someone else for the same address cannot keep its password.
			const verified: AuthenticationUser = {
				...current,
				verified: true,
				dateModified: new Date().toISOString()
			};
			if (Is.stringValue(reset?.password) && Is.stringValue(reset.salt)) {
				verified.password = reset.password;
				verified.salt = reset.salt;
				verified.passwordAlgorithm = reset.passwordAlgorithm;
				verified.passwordHashParameters = reset.passwordHashParameters;
				verified.passwordVersion = (current.passwordVersion ?? 0) + 1;
			}
			return verified;
		});
		await this.assignDefaultRoles(user.accountId);

		await this._authenticationAuditService.create({
			actorId: user.email,
			event: AuthAuditEvent.AccountUpdated,
			data: {
				accountId: user.accountId,
				verified: true
			}
		});
	}

	/**
	 * Get the signed in account.
	 * @returns The account details.
	 * @throws NotFoundError when the account no longer exists.
	 */
	public async me(): Promise<IAuthenticationAccountSummary> {
		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Account);
		const accountId = contextIds[ContextIdKeys.Account];

		const user = await this._userEntityStorage.get(accountId);
		if (!Is.object<AuthenticationUser>(user) || user.accountId !== accountId) {
			throw new NotFoundError(
				EntityStorageAuthenticationService.CLASS_NAME,
				"userNotFound",
				accountId
			);
		}

		const capabilities = AuthenticationProviderFactory.getIfExists<IAuthenticationProvider>(
			user.authProviderId
		)?.getCapabilities(user.providerTenantId);

		return {
			accountId,
			email: user.email,
			authProviderId: user.authProviderId,
			profileReadOnly: capabilities?.profileReadOnly ?? false,
			profileEditUrl: capabilities?.profileEditUrl,
			passwordChangeUrl: capabilities?.passwordChangeUrl,
			identity: contextIds[ContextIdKeys.User],
			organization: contextIds[ContextIdKeys.UserOrganization],
			roles: await this._authorizationComponent.getRolesForSubject(
				this._authorizationModelId,
				accountId
			)
		};
	}

	/**
	 * Logout the current user.
	 * @param token The token to logout, if it uses a mechanism with public access.
	 * @returns A promise that resolves when the logout audit entry has been recorded.
	 */
	public async logout(token?: string): Promise<void> {
		// Nothing to do here, as we are stateless.
		// The cookie will be revoked by the REST route handling
		const contextIds = await ContextIdStore.getContextIds();
		const identifier = contextIds?.[ContextIdKeys.Account];
		if (Is.stringValue(identifier)) {
			await this._authenticationAuditService.create({
				actorId: identifier,
				event: AuthAuditEvent.Logout
			});
		}
	}

	/**
	 * Refresh the token, keeping the start of the session so a session ends once it reaches the
	 * maximum session length. A token without a session start, from an earlier version, starts one.
	 * @param token The token to refresh, if it uses a mechanism with public access.
	 * @returns The refreshed token, if it uses a mechanism with public access.
	 * @throws UnauthorizedError the same way when the token is not valid, the account cannot sign in
	 * or the session has reached its maximum length.
	 */
	public async refresh(token?: string): Promise<{
		token?: string;
		expiry: number;
	}> {
		if (!Is.stringValue(this._nodeId)) {
			throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "nodeIdNotSet");
		}
		const nodeId = this._nodeId;

		let tenantId: string | undefined;
		let refreshUser: AuthenticationUser | undefined;
		let refreshSub: string;
		let sessionStart: number | undefined;

		try {
			const headerAndPayload = await TokenHelper.verify(
				this._vaultConnector,
				nodeId,
				this._signingKeyName,
				token,
				async (sub, tid, passwordVersion) => {
					const validParts = [];

					tenantId = tid;

					// We use the tenant id from the token, if the user is not in that
					// partition then the get will fail. Only override the tenant key when
					// tid is present - setting it to undefined would drop the active partition.
					const baseContext = (await ContextIdStore.getContextIds()) ?? {};
					const contextIdsForUserLookup = Is.stringValue(tid)
						? { ...baseContext, [ContextIdKeys.Tenant]: tid }
						: baseContext;

					const [tenant, user] = await Promise.all([
						Is.stringValue(tid) ? this._tenantAdminComponent?.get(tid) : undefined,
						// Wrap the user lookup in the request context so partitioned storage uses the correct tenant.
						ContextIdStore.run(contextIdsForUserLookup, async () =>
							this._userEntityStorage.get(sub)
						)
					]);

					if (Is.stringValue(tid) && tenant?.id === tid) {
						validParts.push("tenant");
					}

					refreshUser = user;

					if (
						user?.accountId === sub &&
						(passwordVersion ?? 0) === (user.passwordVersion ?? 0) &&
						AccountHelper.canSignIn(user)
					) {
						validParts.push("user");
					}
					return validParts;
				}
			);

			refreshSub = headerAndPayload.payload.sub ?? "";
			const nowSeconds = Math.trunc(Date.now() / DurationConstants.MsPerSecond);
			sessionStart = Coerce.integer(headerAndPayload.payload.sst);
			if (Is.integer(this._maxSessionMinutes)) {
				// A token from an earlier version has no session start, so the length of its session
				// cannot be limited and it signs in again.
				if (
					!Is.integer(sessionStart) ||
					nowSeconds - sessionStart >= this._maxSessionMinutes * DurationConstants.SecondsPerMinute
				) {
					throw new UnauthorizedError(
						EntityStorageAuthenticationService.CLASS_NAME,
						"sessionExpired"
					);
				}
			}
		} catch {
			// The cause is not returned, so a disabled account looks the same as an expired token.
			throw new UnauthorizedError(EntityStorageAuthenticationService.CLASS_NAME, "refreshFailed");
		}

		// Each session is limited on its own, so one session refreshing often does not stop the others.
		await this._authenticationRateService.check(
			EntityStorageAuthenticationService.RATE_ACTION_TOKEN_REFRESH,
			Is.integer(sessionStart) ? `${refreshSub}|${sessionStart}` : refreshSub
		);

		// A token without a session start keeps none, so a refresh never counts as a recent sign in.
		const refreshTokenAndExpiry = await TokenHelper.createToken(
			this._vaultConnector,
			nodeId,
			this._signingKeyName,
			refreshSub,
			tenantId,
			this._defaultTtlMinutes,
			refreshUser?.passwordVersion ?? 0,
			sessionStart ?? null,
			this._maxSessionMinutes
		);

		await this._authenticationAuditService.create({
			actorId: refreshSub,
			event: AuthAuditEvent.TokenRefreshed,
			data: {
				tenantId,
				version: refreshUser?.passwordVersion ?? 0
			}
		});

		return refreshTokenAndExpiry;
	}

	/**
	 * Update the user's password, the current password must be given and match. The other sessions
	 * of the account end and its password reset links stop working, the current session continues
	 * with a new token that keeps the session start of the given token, or starts one without it.
	 * @param currentPassword The current password for the user.
	 * @param newPassword The new password for the user.
	 * @param token The token of the current session, if it uses a mechanism with public access.
	 * @param sessionStart When the current session started in seconds, read from the token when omitted.
	 * @returns The new token for the current session.
	 * @throws ForbiddenError when the current password does not match.
	 * @throws UnauthorizedError when the token is not valid or is for another account.
	 */
	public async updatePassword(
		currentPassword: string,
		newPassword: string,
		token?: string,
		sessionStart?: number
	): Promise<{
		token?: string;
		expiry: number;
	}> {
		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Account);

		const accountId = contextIds[ContextIdKeys.Account];
		await this._authenticationRateService.check("password-change", accountId);

		const user = await this._userEntityStorage.get(accountId);
		if (!Is.object<AuthenticationUser>(user) || user.accountId !== accountId) {
			throw new NotFoundError(
				EntityStorageAuthenticationService.CLASS_NAME,
				"userNotFound",
				accountId
			);
		}

		if (!Is.stringValue(this._nodeId)) {
			throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "nodeIdNotSet");
		}
		const nodeId = this._nodeId;

		// The request processor gives the session start of the token it verified. Otherwise the token is
		// read before the change, as it no longer verifies against the new password version.
		let currentSessionStart = sessionStart;
		if (!Is.integer(currentSessionStart) && Is.stringValue(token)) {
			const { payload } = await TokenHelper.verify(
				this._vaultConnector,
				nodeId,
				this._signingKeyName,
				token
			);
			if (payload.sub !== accountId) {
				throw new UnauthorizedError(
					EntityStorageAuthenticationService.CLASS_NAME,
					"tokenAccountMismatch"
				);
			}
			currentSessionStart = Coerce.integer(payload.sst);
		}

		const updatedUser = await PasswordHelper.updatePassword(
			this._userEntityStorage,
			this._authenticationAuditService,
			user,
			newPassword,
			currentPassword,
			{
				minPasswordLength: this._minPasswordLength,
				maxPasswordLength: this._maxPasswordLength
			},
			{
				requireCurrentPassword: true,
				passwordHashOptions: this._passwordHashOptions,
				passwordResetEntityStorage: this._passwordResetEntityStorage
			}
		);

		await this._authenticationRateService.clear("password-change", accountId);

		return TokenHelper.createToken(
			this._vaultConnector,
			nodeId,
			this._signingKeyName,
			accountId,
			contextIds[ContextIdKeys.Tenant],
			this._defaultTtlMinutes,
			updatedUser.passwordVersion ?? 0,
			currentSessionStart,
			this._maxSessionMinutes
		);
	}

	/**
	 * Get the password policy used for password validation.
	 * @returns The password policy options.
	 */
	public async passwordPolicy(): Promise<IPasswordOptions> {
		return {
			// The lengths the validator applies are returned when none are configured.
			minPasswordLength:
				this._minPasswordLength ?? EntityStorageAuthenticationService.DEFAULT_MIN_PASSWORD_LENGTH,
			maxPasswordLength:
				this._maxPasswordLength ?? EntityStorageAuthenticationService.DEFAULT_MAX_PASSWORD_LENGTH
		};
	}

	/**
	 * Send a link to reset a forgotten password to the e-mail address, when a password account that
	 * can sign in uses it. The account is looked up and the e-mail sent after the response, on the
	 * next scheduler run, so neither the response nor its timing reveal whether the account exists.
	 * @param email The e-mail address of the account.
	 * @returns A promise that resolves when the request has been handled.
	 * @throws TooManyRequestsError when the e-mail address or client asks too often.
	 */
	public async forgotPassword(email: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationService.CLASS_NAME, nameof(email), email);
		const normalisedEmail = EmailHelper.normalise(email);

		const rateAction = EntityStorageAuthenticationService.RATE_ACTION_PASSWORD_FORGOT;
		await this._authenticationRateService.check(rateAction, normalisedEmail);
		const clientKey = await this.clientRateKey();
		if (Is.stringValue(clientKey)) {
			await this._authenticationRateService.check(rateAction, clientKey);
		}

		await this.queueDelivery(async () => this.sendPasswordReset(email));
	}

	/**
	 * Reset a forgotten password with the token from the reset link, ending every session of the account
	 * and verifying an account still waiting for verification.
	 * @param token The token from the reset link.
	 * @param newPassword The new password for the account.
	 * @returns A promise that resolves when the password has been reset.
	 * @throws UnauthorizedError when the token is unknown, used or expired, or the account is disabled.
	 * @throws TooManyRequestsError when the client resets too often.
	 */
	public async resetPassword(token: string, newPassword: string): Promise<void> {
		Guards.stringValue(EntityStorageAuthenticationService.CLASS_NAME, nameof(token), token);
		Guards.stringValue(
			EntityStorageAuthenticationService.CLASS_NAME,
			nameof(newPassword),
			newPassword
		);

		await this._authenticationRateService.check(
			EntityStorageAuthenticationService.RATE_ACTION_PASSWORD_RESET,
			(await this.clientRateKey()) ?? PasswordResetHelper.hashToken(token)
		);

		// The password is checked first so a password the policy refuses does not use up the token.
		PasswordValidator.validatePassword(newPassword, {
			minLength: this._minPasswordLength,
			maxLength: this._maxPasswordLength
		});

		const accountId = (await PasswordResetHelper.consume(this._passwordResetEntityStorage, token))
			?.accountId;
		const user = Is.stringValue(accountId)
			? await this._userEntityStorage.get(accountId)
			: undefined;
		if (
			!Is.object<AuthenticationUser>(user) ||
			user.accountId !== accountId ||
			user.authProviderId !== EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID ||
			AccountHelper.isDisabled(user)
		) {
			throw new UnauthorizedError(
				EntityStorageAuthenticationService.CLASS_NAME,
				"passwordResetInvalid"
			);
		}

		// The link was sent to the address, so following it verifies an account still waiting for it.
		const verifying = user.verified === false;

		await PasswordHelper.updatePassword(
			this._userEntityStorage,
			this._authenticationAuditService,
			user,
			newPassword,
			undefined,
			{
				minPasswordLength: this._minPasswordLength,
				maxPasswordLength: this._maxPasswordLength
			},
			{
				requireCurrentPassword: false,
				passwordHashOptions: this._passwordHashOptions,
				passwordResetEntityStorage: this._passwordResetEntityStorage,
				markVerified: verifying
			}
		);

		if (verifying) {
			await this.assignDefaultRoles(user.accountId);
			await this._authenticationAuditService.create({
				actorId: user.email,
				event: AuthAuditEvent.AccountUpdated,
				data: {
					accountId: user.accountId,
					verified: true
				}
			});
		}
	}

	/**
	 * Remove the signed in account, its account data, its roles and its requests to join an
	 * organization. The account is disabled first, so its tokens stop working and nothing signs in
	 * meanwhile, then its identity is removed through the account data component, with
	 * the keys the node holds for it, a document published on a ledger is kept. The account is enabled
	 * again when the identity cannot be removed, so the owner can sign in and try again. The route
	 * signs the caller out.
	 * @param sessionStart When the current session started in seconds, it must be recent.
	 * @returns A promise that resolves when the account has been removed.
	 * @throws UnauthorizedError when the session did not start recently.
	 * @throws NotFoundError when the account no longer exists.
	 */
	public async removeAccount(sessionStart?: number): Promise<void> {
		const contextIds = await ContextIdStore.getContextIds();
		ContextIdHelper.guard(contextIds, ContextIdKeys.Account);
		const accountId = contextIds[ContextIdKeys.Account];
		RecentSignInHelper.guard(sessionStart, this._recentSignInSeconds);

		const user = await this._userEntityStorage.get(accountId);
		if (!Is.object<AuthenticationUser>(user) || user.accountId !== accountId) {
			throw new NotFoundError(
				EntityStorageAuthenticationService.CLASS_NAME,
				"userNotFound",
				accountId
			);
		}

		const disabled = await AccountHelper.disable(this._userEntityStorage, user);

		// The account component removes the identity as the signed in account.
		try {
			await this._authenticationAccount.removeIdentity(sessionStart);
		} catch (error) {
			// An account without an identity has nothing to remove.
			if (!BaseError.isErrorName(error, NotFoundError.CLASS_NAME)) {
				if (Is.object<AuthenticationUser>(disabled)) {
					await this.restoreEnabled(disabled);
				}
				throw error;
			}
		}

		await AccountHelper.removeAccount(
			this._userEntityStorage,
			this._passwordResetEntityStorage,
			this._authenticationAccountAdmin,
			this._organizationRequestAdmin,
			accountId,
			{ component: this._authorizationComponent, modelId: this._authorizationModelId }
		);

		await this._authenticationAuditService.create({
			actorId: user.email,
			event: AuthAuditEvent.AccountDeleted,
			data: {
				accountId,
				tenantId: contextIds[ContextIdKeys.Tenant]
			}
		});
	}

	/**
	 * Get the authentication providers enabled on the server.
	 * @param types The provider types to include, all types when left out.
	 * @returns The providers and what each supports, in the order they were registered.
	 */
	public async providers(
		types?: AuthenticationProviderType[]
	): Promise<IAuthenticationProviderDetails[]> {
		const providers = AuthenticationProviderFactory.names().map(authProviderId => ({
			authProviderId,
			...AuthenticationProviderFactory.get(authProviderId).getCapabilities()
		}));
		return Is.arrayValue(types)
			? providers.filter(provider => types.includes(provider.type))
			: providers;
	}

	/**
	 * Check the e-mail address and password of a password account that may sign in, rate limited,
	 * with a failure audited.
	 * @param email The email address for the user.
	 * @param password The password for the user.
	 * @returns The account, the identity the provider verified, and the keys it was rate limited with.
	 * @throws UnauthorizedError the same way when the account is unknown, disabled, the password does
	 * not match or the e-mail address or client tries too often, and with accountNotVerified when the
	 * password matches an enabled account whose e-mail address is not verified yet.
	 * @internal
	 */
	private async checkPassword(
		email: string,
		password: string
	): Promise<{
		user: AuthenticationUser;
		identity: IAuthenticationProviderIdentity;
		normalisedEmail: string;
		loginKey: string;
	}> {
		const normalisedEmail = EmailHelper.normalise(email);
		// Per client limiting is opt in. A failing client is then limited on its own, and per e-mail
		// address only together with the client, so an attacker cannot lock the account out for
		// everyone. The account wide limit is higher and only guards against many addresses.
		const clientKey = this._loginRateLimitPerClient ? await this.clientRateKey() : undefined;
		const loginKey = Is.stringValue(clientKey)
			? `${normalisedEmail}|${clientKey}`
			: normalisedEmail;

		let accountNotVerified = false;

		try {
			const checks = [
				this._authenticationRateService.check(
					EntityStorageAuthenticationService.RATE_ACTION_LOGIN,
					loginKey
				)
			];
			if (this._loginRateLimitPerClient) {
				checks.push(
					this._authenticationRateService.check(
						EntityStorageAuthenticationService.RATE_ACTION_LOGIN_ACCOUNT,
						normalisedEmail
					)
				);
				if (Is.stringValue(clientKey)) {
					checks.push(
						this._authenticationRateService.check(
							EntityStorageAuthenticationService.RATE_ACTION_LOGIN_CLIENT,
							clientKey
						)
					);
				}
			}
			await Promise.all(checks);

			const provider = AuthenticationProviderFactory.get(
				EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID
			);
			const identity = await provider.authenticate({ email, password });

			// The account is read again, by its id when the provider gives it, so its state is current.
			const user = Is.stringValue(identity.accountId)
				? await this._userEntityStorage.get(identity.accountId)
				: await AccountHelper.findByProviderAccount(
						this._userEntityStorage,
						EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID,
						identity.providerAccountId
					);
			if (
				!Is.object<AuthenticationUser>(user) ||
				user.authProviderId !== EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID
			) {
				throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "userNotFound");
			}
			// The password matched, so only its owner learns the e-mail address must be verified.
			accountNotVerified = !AccountHelper.isDisabled(user) && user.verified === false;
			if (!AccountHelper.canSignIn(user)) {
				throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "accountDisabled");
			}

			return { user, identity, normalisedEmail, loginKey };
		} catch {
			await this._authenticationAuditService.create({
				actorId: normalisedEmail,
				event: AuthAuditEvent.LoginFailure
			});

			if (accountNotVerified) {
				throw new UnauthorizedError(
					EntityStorageAuthenticationService.CLASS_NAME,
					"accountNotVerified"
				);
			}
			// The cause is not returned, so a disabled or unknown account looks the same as a wrong
			// password. A rate limited login is also refused this way, as before.
			throw new UnauthorizedError(EntityStorageAuthenticationService.CLASS_NAME, "loginFailed");
		}
	}

	/**
	 * Clear the login rate limits of a password account once its password has been accepted. The
	 * account wide entry is only kept with per client limiting.
	 * @param normalisedEmail The normalised e-mail address of the account.
	 * @param loginKey The key the login was rate limited with.
	 * @returns A promise that resolves when the rate limits have been cleared.
	 * @internal
	 */
	private async clearPasswordRateLimits(normalisedEmail: string, loginKey: string): Promise<void> {
		await Promise.all([
			this._authenticationRateService.clear(
				EntityStorageAuthenticationService.RATE_ACTION_LOGIN,
				loginKey
			),
			this._loginRateLimitPerClient
				? this._authenticationRateService.clear(
						EntityStorageAuthenticationService.RATE_ACTION_LOGIN_ACCOUNT,
						normalisedEmail
					)
				: undefined
		]);
	}

	/**
	 * Issue a token for an account and record the login.
	 * @param nodeId The node identifier.
	 * @param user The account to sign in.
	 * @param providerIdentity The identity a provider verified, whose tenant is stored, kept as it was
	 * when the identity gives none.
	 * @returns The account, the tenant of the login and the token.
	 * @internal
	 */
	private async startSession(
		nodeId: string,
		user: AuthenticationUser,
		providerIdentity?: IAuthenticationProviderIdentity
	): Promise<{ user: AuthenticationUser; tenantId?: string; token?: string; expiry: number }> {
		if (!AccountHelper.canSignIn(user)) {
			throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "accountDisabled");
		}

		// This might be undefined if the login is performed in a single tenant context
		// it is verified during the token processing, tenant id will be matched against
		// the context
		const contextIds = await ContextIdStore.getContextIds();
		const tenantId = contextIds?.[ContextIdKeys.Tenant];

		// Records the login on the account as read, the last write wins.
		const signedIn = await AccountHelper.update(this._userEntityStorage, user, current => {
			if (!AccountHelper.canSignIn(current)) {
				throw new GeneralError(EntityStorageAuthenticationService.CLASS_NAME, "accountDisabled");
			}
			return {
				...current,
				dateLastLogin: new Date().toISOString(),
				providerTenantId: providerIdentity?.providerTenantId ?? current.providerTenantId
			};
		});

		const tokenAndExpiry = await TokenHelper.createToken(
			this._vaultConnector,
			nodeId,
			this._signingKeyName,
			user.accountId,
			tenantId,
			this._defaultTtlMinutes,
			user.passwordVersion ?? 0,
			undefined,
			this._maxSessionMinutes
		);

		return { user: signedIn ?? user, tenantId, ...tokenAndExpiry };
	}

	/**
	 * Complete a sign up that must be verified, run after the response. A new address gets an
	 * unverified account and a verification link, an address with an unverified account gets a new
	 * link that sets the password of this sign up when verified, and the owner of an address with an
	 * account is told of the sign up. An unverified account
	 * older than the link expiry is replaced, so an address cannot be held by a sign up nobody verifies.
	 * @param registration The details of the account, with the e-mail address normalised.
	 * @param passwordHash The hash of the password of the sign up.
	 * @returns A promise that resolves when the sign up has been handled.
	 * @internal
	 */
	private async completeRegistration(
		registration: Omit<IAuthenticationRegistration, "password">,
		passwordHash: Awaited<ReturnType<typeof PasswordHelper.hashPassword>>
	): Promise<void> {
		const expiryMs = this._registrationVerificationExpiryMinutes * DurationConstants.MsPerMinute;
		const lockKey = await AccountHelper.lockKey(`register|${registration.email}`);
		await Mutex.lock(lockKey, { throwOnTimeout: true });
		let result: { user: AuthenticationUser; created: boolean };
		try {
			let existing = await AccountHelper.findByEmail(
				this._userEntityStorage,
				EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID,
				registration.email
			);
			if (
				existing?.verified === false &&
				Date.parse(existing.dateCreated) + expiryMs <= Date.now()
			) {
				await AccountHelper.removeAccount(
					this._userEntityStorage,
					this._passwordResetEntityStorage,
					this._authenticationAccountAdmin,
					this._organizationRequestAdmin,
					existing.accountId,
					{ component: this._authorizationComponent, modelId: this._authorizationModelId }
				);
				existing = undefined;
			}
			result = Is.object<AuthenticationUser>(existing)
				? { user: existing, created: false }
				: {
						user: await PasswordHelper.createUserWithHash(
							this._userEntityStorage,
							EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID,
							RandomHelper.generateUuidV7(),
							registration.email,
							passwordHash,
							{ verified: false }
						),
						created: true
					};
		} finally {
			Mutex.unlock(lockKey);
		}

		if (result.created) {
			await this.recordAccountCreated(result.user);
			await this.storeProfile(result.user.accountId, this.registrationProfile(registration), false);
		}

		if (result.user.verified !== false) {
			await this.sendEmail(
				"registration",
				result.user,
				this._registrationExistsEmailTemplateId,
				{}
			);
			return;
		}

		// The password of this sign up is kept with its link and set when the link is verified, as a
		// pending account may have been created by someone else. Earlier links are replaced.
		const { token, expires } = await PasswordResetHelper.create(
			this._passwordResetEntityStorage,
			result.user.accountId,
			this._registrationVerificationExpiryMinutes,
			PasswordResetHelper.PURPOSE_REGISTRATION,
			{
				password: passwordHash.password,
				salt: passwordHash.salt,
				passwordAlgorithm: passwordHash.passwordAlgorithm,
				passwordHashParameters: passwordHash.passwordHashParameters
			}
		);
		const verifyUrl = new URL(this._registrationVerificationUrl);
		verifyUrl.searchParams.set("token", token);
		await this.sendEmail(
			"registration",
			result.user,
			this._registrationVerificationEmailTemplateId,
			{
				verifyUrl: verifyUrl.toString(),
				expires,
				expiryMinutes: this._registrationVerificationExpiryMinutes.toString()
			}
		);
	}

	/**
	 * Send a password reset link, when an enabled password account uses the address. An unverified
	 * account is included, as resetting its password also verifies it.
	 * @param email The e-mail address.
	 * @returns A promise that resolves when the request has been handled.
	 * @internal
	 */
	private async sendPasswordReset(email: string): Promise<void> {
		const user = await AccountHelper.findByEmail(
			this._userEntityStorage,
			EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID,
			email
		);
		if (!Is.object<AuthenticationUser>(user) || AccountHelper.isDisabled(user)) {
			return;
		}

		const { token, expires } = await PasswordResetHelper.create(
			this._passwordResetEntityStorage,
			user.accountId,
			this._passwordResetExpiryMinutes
		);

		const resetUrl = new URL(this._passwordResetUrl);
		resetUrl.searchParams.set("token", token);
		await this.sendEmail("passwordReset", user, this._passwordResetEmailTemplateId, {
			resetUrl: resetUrl.toString(),
			expires,
			expiryMinutes: this._passwordResetExpiryMinutes.toString()
		});
	}

	/**
	 * Send an e-mail to an account, in the language the request that asked for it prefers, or the
	 * e-mail locale when it gave none. A failure is logged and not returned.
	 * @param kind The kind of e-mail.
	 * @param user The account.
	 * @param templateId The template.
	 * @param data The values for the template.
	 * @returns A promise that resolves when the e-mail has been sent or the failure logged.
	 * @internal
	 */
	private async sendEmail(
		kind: "passwordReset" | "registration",
		user: AuthenticationUser,
		templateId: string,
		data: { [key: string]: string }
	): Promise<void> {
		const contextIds = await ContextIdStore.getContextIds();
		try {
			await this._messagingComponent.sendCustomEmail(
				this._emailSender,
				[user.email],
				templateId,
				{ ...this._emailTemplateData, ...data },
				contextIds?.[HttpContextIdKeys.Language] ?? this._emailLocale
			);
		} catch (error) {
			// A failure is not returned, so the response does not reveal the account exists.
			await this._logging?.log({
				level: "warn",
				source: EntityStorageAuthenticationService.CLASS_NAME,
				ts: Date.now(),
				message: kind === "passwordReset" ? "passwordResetEmailFailed" : "registrationEmailFailed",
				error: BaseError.fromError(error),
				data: { accountId: user.accountId }
			});
		}
	}

	/**
	 * Queue a delivery to run after the response, on the next delivery run or when the service
	 * stops. Failures are logged, as the response does not wait for the delivery.
	 * @param method The delivery.
	 * @returns A promise that resolves when the delivery has been queued.
	 * @internal
	 */
	private async queueDelivery(method: () => Promise<void>): Promise<void> {
		this._deliveryJobs.push({ contextIds: await ContextIdStore.getContextIds(), method });
	}

	/**
	 * Remove the expired password reset and verification tokens, and the unverified sign ups older
	 * than the verification link expiry that have no unexpired link, in every tenant. Failures are
	 * logged.
	 * @returns A promise that resolves when the cleanup has run.
	 * @internal
	 */
	private async cleanupExpired(): Promise<void> {
		await this._platformComponent.execute(async () =>
			this.runJob(async () => this.removeExpiredInTenant())
		);
	}

	/**
	 * Remove the expired tokens and unverified sign ups of the current tenant.
	 * @returns A promise that resolves when they have been removed.
	 * @internal
	 */
	private async removeExpiredInTenant(): Promise<void> {
		await PasswordResetHelper.removeExpired(this._passwordResetEntityStorage);
		await AuthorizationCodeHelper.removeExpired(this._authorizationCodeEntityStorage);

		// The ids are gathered first, as removing while paging would move the cursor past accounts.
		const expiryMs = this._registrationVerificationExpiryMinutes * DurationConstants.MsPerMinute;
		const cutoff = Date.now() - expiryMs;
		const accountIds: string[] = [];
		let cursor: string | undefined;
		do {
			const page = await this._userEntityStorage.query(
				{ property: "verified", value: false, comparison: ComparisonOperator.Equals },
				undefined,
				["accountId", "dateCreated", "verified"],
				cursor
			);
			for (const user of page.entities) {
				if (
					Is.stringValue(user.accountId) &&
					user.verified === false &&
					Is.stringValue(user.dateCreated) &&
					Date.parse(user.dateCreated) <= cutoff
				) {
					accountIds.push(user.accountId);
				}
			}
			cursor = page.cursor;
		} while (Is.stringValue(cursor));

		for (const accountId of accountIds) {
			await this.removeUnverified(accountId);
		}
	}

	/**
	 * Remove an unverified sign up that has no unexpired link, disabling it first only while it is
	 * still unverified, so a verification made meanwhile is kept, and one made after is refused.
	 * @param accountId The account id.
	 * @returns A promise that resolves when the sign up has been removed or kept.
	 * @internal
	 */
	private async removeUnverified(accountId: string): Promise<void> {
		// A link sent again for the sign up, or a reset link, may still verify the account.
		const links = await this._passwordResetEntityStorage.query(
			{ property: "accountId", value: accountId, comparison: ComparisonOperator.Equals },
			undefined,
			["id"],
			undefined,
			1
		);
		const user = await this._userEntityStorage.get(accountId);
		if (links.entities.length > 0 || !Is.object<AuthenticationUser>(user)) {
			return;
		}

		let expired = false;
		await AccountHelper.update(this._userEntityStorage, user, current => {
			expired = current.verified === false;
			if (!expired || AccountHelper.isDisabled(current)) {
				return;
			}
			const now = new Date().toISOString();
			return {
				...current,
				dateDisabled: now,
				passwordVersion: (current.passwordVersion ?? 0) + 1,
				dateModified: now
			};
		});
		if (expired) {
			await AccountHelper.removeAccount(
				this._userEntityStorage,
				this._passwordResetEntityStorage,
				this._authenticationAccountAdmin,
				this._organizationRequestAdmin,
				accountId,
				{ component: this._authorizationComponent, modelId: this._authorizationModelId }
			);
		}
	}

	/**
	 * Run the queued deliveries, each in the context it was queued in.
	 * @returns A promise that resolves when the deliveries have run.
	 * @internal
	 */
	private async runDeliveries(): Promise<void> {
		const jobs = this._deliveryJobs.splice(0);
		for (const job of jobs) {
			await ContextIdStore.run(job.contextIds ?? {}, async () => this.runJob(job.method));
		}
	}

	/**
	 * Run work, logging a failure.
	 * @param method The work.
	 * @returns A promise that resolves when the work has run.
	 * @internal
	 */
	private async runJob(method: () => Promise<void>): Promise<void> {
		try {
			await method();
		} catch (error) {
			await this._logging?.log({
				level: "error",
				source: EntityStorageAuthenticationService.CLASS_NAME,
				ts: Date.now(),
				message: "scheduledTaskFailed",
				error: BaseError.fromError(error)
			});
		}
	}

	/**
	 * Find the account a provider identifies, creating it on the first login when provider sign up is
	 * enabled. Concurrent first logins are serialised so only one account is created.
	 * @param authProviderId The authentication provider id.
	 * @param identity The identity the provider verified.
	 * @returns The account.
	 * @internal
	 */
	private async findOrCreateProviderAccount(
		authProviderId: string,
		identity: IAuthenticationProviderIdentity
	): Promise<AuthenticationUser> {
		const lockKey = await AccountHelper.lockKey(
			`provider|${authProviderId}|${identity.providerAccountId}`
		);
		await Mutex.lock(lockKey, { throwOnTimeout: true });
		try {
			const user = await AccountHelper.findByProviderAccount(
				this._userEntityStorage,
				authProviderId,
				identity.providerAccountId
			);
			if (Is.object<AuthenticationUser>(user)) {
				return user;
			}
			return await this.createProviderAccount(authProviderId, identity);
		} finally {
			Mutex.unlock(lockKey);
		}
	}

	/**
	 * Store the profile a provider holds as the account data of the account, marked read only as
	 * the provider owns it.
	 * @param accountId The account id.
	 * @param identity The identity the provider verified.
	 * @returns A promise that resolves when the profile has been stored.
	 * @internal
	 */
	private async storeProviderProfile(
		accountId: string,
		identity: IAuthenticationProviderIdentity
	): Promise<void> {
		if (Is.object(identity.profile)) {
			await this.storeProfile(accountId, identity.profile, true);
		}
	}

	/**
	 * Store the photo a provider holds as the avatar of the account, marked read only as the provider
	 * owns it, or remove the avatar the provider stored when it now holds none. A photo the provider
	 * could not give leaves the stored avatar, and a failure is logged, never thrown.
	 * @param accountId The account id.
	 * @param identity The identity the provider verified.
	 * @returns A promise that resolves when the avatar has been stored.
	 * @internal
	 */
	private async storeProviderAvatar(
		accountId: string,
		identity: IAuthenticationProviderIdentity
	): Promise<void> {
		const avatar = identity.avatar;
		if (Is.undefined(avatar)) {
			return;
		}

		try {
			const page = await this._authenticationAccountAdmin.query(
				accountId,
				AuthenticationAccountDataType.Avatar
			);
			if (Is.object(avatar)) {
				const value = AuthenticationAccountHelper.markReadOnly(avatar);
				const item = page.entities.find(e => e.isDefault) ?? page.entities[0];
				if (!Is.object(item)) {
					await this._authenticationAccountAdmin.create(
						accountId,
						AuthenticationAccountDataType.Avatar,
						value,
						true
					);
				} else if (!item.isDefault || !ObjectHelper.equal(item.data, value, false)) {
					// A provider gives the same photo on most logins, so it is only written when it changed.
					await this._authenticationAccountAdmin.update(item.id, value, true);
				}
			} else {
				// Only the avatar the provider stored is removed, not one the account uploaded.
				for (const item of page.entities) {
					if (AuthenticationAccountHelper.isReadOnly(item.data)) {
						await this._authenticationAccountAdmin.remove(item.id);
					}
				}
			}
		} catch (error) {
			await this._logging?.log({
				level: "warn",
				source: EntityStorageAuthenticationService.CLASS_NAME,
				ts: Date.now(),
				message: "providerAvatarFailed",
				error: BaseError.fromError(error),
				data: { accountId }
			});
		}
	}

	/**
	 * Build the profile of a sign up.
	 * @param registration The details of the account.
	 * @returns The profile.
	 * @internal
	 */
	private registrationProfile(
		registration: Omit<IAuthenticationRegistration, "password">
	): NonNullable<IAuthenticationProviderIdentity["profile"]> {
		return {
			"@context": "https://schema.org",
			"@type": "Person",
			email: registration.email,
			givenName: registration.givenName,
			familyName: registration.familyName
		};
	}

	/**
	 * Store a profile as the profile account data of the account, which is private unless the account
	 * makes parts of it public.
	 * @param accountId The account id.
	 * @param profile The profile.
	 * @param readOnly True to mark the profile read only, so the account may not change it.
	 * @returns A promise that resolves when the profile has been stored.
	 * @internal
	 */
	private async storeProfile(
		accountId: string,
		profile: NonNullable<IAuthenticationProviderIdentity["profile"]>,
		readOnly: boolean
	): Promise<void> {
		const value = readOnly ? AuthenticationAccountHelper.markReadOnly(profile) : profile;
		const page = await this._authenticationAccountAdmin.query(
			accountId,
			AuthenticationAccountDataType.Profile
		);
		const item = page.entities.find(e => e.isDefault) ?? page.entities[0];
		if (!Is.object(item)) {
			await this._authenticationAccountAdmin.create(
				accountId,
				AuthenticationAccountDataType.Profile,
				value,
				true
			);
		} else if (!item.isDefault || !ObjectHelper.equal(item.data, value, false)) {
			// A provider gives the same profile on most logins, so it is only written when it changed.
			await this._authenticationAccountAdmin.update(item.id, value, true);
		}
	}

	/**
	 * Give an account the default roles.
	 * @param accountId The account id.
	 * @returns A promise that resolves when the roles have been given.
	 * @internal
	 */
	private async assignDefaultRoles(accountId: string): Promise<void> {
		await Promise.all(
			this._defaultRoles.map(async role =>
				this._authorizationComponent.addRoleForSubject(this._authorizationModelId, accountId, role)
			)
		);
	}

	/**
	 * Enable again an account disabled for its removal, when the removal could not go on. The
	 * password version stays moved on, so the owner signs in again. A failure is logged, so the
	 * error that stopped the removal is returned.
	 * @param disabled The account as disabled.
	 * @returns A promise that resolves when the account has been enabled.
	 * @internal
	 */
	private async restoreEnabled(disabled: AuthenticationUser): Promise<void> {
		try {
			await AccountHelper.update(this._userEntityStorage, disabled, current => {
				if (!AccountHelper.isDisabled(current)) {
					return;
				}
				return {
					...current,
					dateDisabled: undefined,
					dateModified: new Date().toISOString()
				};
			});
		} catch (error) {
			await this._logging?.log({
				level: "error",
				source: EntityStorageAuthenticationService.CLASS_NAME,
				ts: Date.now(),
				message: "accountRestoreFailed",
				error: BaseError.fromError(error),
				data: { accountId: disabled.accountId }
			});
		}
	}

	/**
	 * Record the creation of an account.
	 * @param user The account.
	 * @returns A promise that resolves when the audit entry has been recorded.
	 * @internal
	 */
	private async recordAccountCreated(user: AuthenticationUser): Promise<void> {
		await this._authenticationAuditService.create({
			actorId: user.email,
			event: AuthAuditEvent.AccountCreated,
			data: {
				accountId: user.accountId,
				authProviderId: user.authProviderId
			}
		});
	}

	/**
	 * Ensure the password provider is registered, as people may only sign up for a password account
	 * when it is.
	 * @throws ForbiddenError when it is not registered.
	 * @internal
	 */
	private guardPasswordProviderRegistered(): void {
		if (
			!AuthenticationProviderFactory.hasName(
				EntityStorageAuthenticationAdminService.AUTH_PROVIDER_ID
			)
		) {
			throw new ForbiddenError(
				EntityStorageAuthenticationService.CLASS_NAME,
				"selfRegistrationDisabled"
			);
		}
	}

	/**
	 * Get the key to rate limit a client with, the hashed client address so the address is not
	 * stored.
	 * @returns The key, or undefined when the client address is not known or not trusted.
	 * @internal
	 */
	private async clientRateKey(): Promise<string | undefined> {
		// Without trusted proxies the address may be a proxy shared by every client, or spoofed.
		if (!this._clientAddressRateLimitEnabled) {
			return undefined;
		}
		const contextIds = await ContextIdStore.getContextIds();
		const ipAddress = contextIds?.[HttpContextIdKeys.IpAddress];
		return Is.stringValue(ipAddress)
			? `ip-${Converter.bytesToHex(Sha256.sum256(Converter.utf8ToBytes(ipAddress)))}`
			: undefined;
	}

	/**
	 * Create the account for the first login through a provider, its e-mail address verified by the
	 * provider.
	 * @param authProviderId The authentication provider id.
	 * @param identity The identity the provider verified.
	 * @returns The new account.
	 * @internal
	 */
	private async createProviderAccount(
		authProviderId: string,
		identity: IAuthenticationProviderIdentity
	): Promise<AuthenticationUser> {
		const now = new Date().toISOString();
		const user: AuthenticationUser = {
			accountId: RandomHelper.generateUuidV7(),
			email: EmailHelper.normalise(identity.email),
			authProviderId,
			providerAccountId: identity.providerAccountId,
			providerTenantId: identity.providerTenantId,
			passwordVersion: 0,
			dateCreated: now,
			dateModified: now
		};
		await this._userEntityStorage.set(user);

		await this.recordAccountCreated(user);
		await this.assignDefaultRoles(user.accountId);

		return user;
	}
}
