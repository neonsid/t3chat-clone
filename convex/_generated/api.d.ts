/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accounts from "../accounts.js";
import type * as attachmentConstants from "../attachmentConstants.js";
import type * as attachments from "../attachments.js";
import type * as chatRuns from "../chatRuns.js";
import type * as constants from "../constants.js";
import type * as crons from "../crons.js";
import type * as docxExtract from "../docxExtract.js";
import type * as helpers_branchThread from "../helpers/branchThread.js";
import type * as helpers_clerkWebhook from "../helpers/clerkWebhook.js";
import type * as helpers_cloneAttachment from "../helpers/cloneAttachment.js";
import type * as helpers_functions from "../helpers/functions.js";
import type * as helpers_generateThreadTitle from "../helpers/generateThreadTitle.js";
import type * as helpers_messages from "../helpers/messages.js";
import type * as helpers_threads from "../helpers/threads.js";
import type * as helpers_truncateThread from "../helpers/truncateThread.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as preferences from "../preferences.js";
import type * as r2 from "../r2.js";
import type * as threadTitles from "../threadTitles.js";
import type * as threads from "../threads.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accounts: typeof accounts;
  attachmentConstants: typeof attachmentConstants;
  attachments: typeof attachments;
  chatRuns: typeof chatRuns;
  constants: typeof constants;
  crons: typeof crons;
  docxExtract: typeof docxExtract;
  "helpers/branchThread": typeof helpers_branchThread;
  "helpers/clerkWebhook": typeof helpers_clerkWebhook;
  "helpers/cloneAttachment": typeof helpers_cloneAttachment;
  "helpers/functions": typeof helpers_functions;
  "helpers/generateThreadTitle": typeof helpers_generateThreadTitle;
  "helpers/messages": typeof helpers_messages;
  "helpers/threads": typeof helpers_threads;
  "helpers/truncateThread": typeof helpers_truncateThread;
  http: typeof http;
  messages: typeof messages;
  migrations: typeof migrations;
  preferences: typeof preferences;
  r2: typeof r2;
  threadTitles: typeof threadTitles;
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
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
};
