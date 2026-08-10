import { ConvexError, v } from "convex/values"

import { isChatModelId } from "../src/lib/chat-models"
import {
  DEFAULT_FAVORITE_MODEL_IDS,
  DEFAULT_SELECTED_MODEL_ID,
} from "./constants"
import { authedMutation, authedQuery } from "./helpers/functions"

const defaultPreferences = {
  selectedModelId: DEFAULT_SELECTED_MODEL_ID,
  favoriteModelIds: [...DEFAULT_FAVORITE_MODEL_IDS],
  combineResults: true,
}

export const get = authedQuery({
  args: {},
  handler: async (ctx) => {
    const preferences = await ctx.db
      .query("preferences")
      .withIndex("by_ownerId", (query) => query.eq("ownerId", ctx.viewerId))
      .unique()

    if (!preferences) return defaultPreferences

    const selectedModelId = isChatModelId(preferences.selectedModelId)
      ? preferences.selectedModelId
      : DEFAULT_SELECTED_MODEL_ID
    const favoriteModelIds = [...new Set(preferences.favoriteModelIds)]
      .filter(isChatModelId)
      .slice(0, 4)

    return {
      selectedModelId,
      favoriteModelIds:
        favoriteModelIds.length > 0
          ? favoriteModelIds
          : [...DEFAULT_FAVORITE_MODEL_IDS],
      combineResults: preferences.combineResults,
    }
  },
})

export const update = authedMutation({
  args: {
    selectedModelId: v.string(),
    favoriteModelIds: v.array(v.string()),
    combineResults: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!isChatModelId(args.selectedModelId)) {
      throw new ConvexError("Unknown model")
    }

    const favoriteModelIds = [...new Set(args.favoriteModelIds)]
      .filter(isChatModelId)
      .slice(0, 4)
    const existing = await ctx.db
      .query("preferences")
      .withIndex("by_ownerId", (query) => query.eq("ownerId", ctx.viewerId))
      .unique()
    const value = {
      selectedModelId: args.selectedModelId,
      favoriteModelIds,
      combineResults: args.combineResults,
    }

    if (existing) {
      await ctx.db.patch("preferences", existing._id, value)
    } else {
      await ctx.db.insert("preferences", {
        ownerId: ctx.viewerId,
        ...value,
      })
    }
    return null
  },
})
