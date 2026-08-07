import { Migrations } from "@convex-dev/migrations"

import { components } from "./_generated/api"
import { getMessageContent, getMessageThinking } from "./helpers/messages"
import type { DataModel } from "./_generated/dataModel"

export const migrations = new Migrations<DataModel>(components.migrations)

export const messagesToPlainText = migrations.define({
  table: "messages",
  migrateOne: (_ctx, message) => ({
    content: getMessageContent(message),
    thinking: getMessageThinking(message) || undefined,
    parts: undefined,
  }),
})
