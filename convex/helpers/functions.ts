import { ConvexError } from "convex/values"
import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions"

import { mutation, query } from "../_generated/server"

const authenticatedContext = customCtx(async (ctx) => {
  const viewer = await ctx.auth.getUserIdentity()

  if (!viewer) {
    throw new ConvexError("Not authenticated")
  }

  return {
    viewer,
    viewerId: viewer.tokenIdentifier,
  }
})

export const authedQuery = customQuery(query, authenticatedContext)
export const authedMutation = customMutation(mutation, authenticatedContext)
