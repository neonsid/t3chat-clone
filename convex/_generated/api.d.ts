/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chatRuns from "../chatRuns.js";
import type * as constants from "../constants.js";
import type * as helpers_functions from "../helpers/functions.js";
import type * as helpers_messages from "../helpers/messages.js";
import type * as helpers_threads from "../helpers/threads.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as preferences from "../preferences.js";
import type * as threads from "../threads.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chatRuns: typeof chatRuns;
  constants: typeof constants;
  "helpers/functions": typeof helpers_functions;
  "helpers/messages": typeof helpers_messages;
  "helpers/threads": typeof helpers_threads;
  messages: typeof messages;
  migrations: typeof migrations;
  preferences: typeof preferences;
  threads: typeof threads;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
