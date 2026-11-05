// Copyright 2026 3Sixty Trade Ltd.
// SPDX-License-Identifier: Apache-2.0.
import { Factory } from "@3sixty/core";
import type { IFeatureDefinition } from "../models/IFeatureDefinition.js";

/**
 * Factory for the features of the node, keyed by the name of the feature, which any component can register.
 */
export const FeatureFactory = Factory.createFactory<IFeatureDefinition>("feature");
