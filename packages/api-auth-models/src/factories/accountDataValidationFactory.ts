// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@3sixty/core";
import type { IAccountDataVerifier } from "../models/IAccountDataVerifier.js";

/**
 * Factory for the verifiers of account data, keyed by the normalised type of the item they verify.
 */
export const AccountDataValidationFactory =
	Factory.createFactory<IAccountDataVerifier>("account-data-validation");
