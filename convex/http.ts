import { httpRouter } from "convex/server"

import { internal } from "./_generated/api"
import { httpAction } from "./_generated/server"
import {
  parseClerkDeletedWebhook,
  verifySvixSignature,
} from "./helpers/clerkWebhook"
import { polar } from "./polar"

const http = httpRouter()

polar.registerRoutes(http)

http.route({
  path: "/clerk/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET
    if (!secret) {
      return new Response("Webhook is not configured", { status: 500 })
    }

    const payload = await request.text()
    const valid = await verifySvixSignature(payload, request.headers, secret)
    if (!valid) {
      return new Response("Forbidden", { status: 403 })
    }

    const parsed = parseClerkDeletedWebhook(payload)
    if (parsed.kind === "invalid-json") {
      return new Response("Invalid JSON", { status: 400 })
    }
    if (parsed.kind === "user.deleted") {
      await ctx.runMutation(internal.accounts.deleteOwnerByClerkUserId, {
        clerkUserId: parsed.clerkUserId,
      })
    }

    return new Response("Accepted", { status: 202 })
  }),
})

export default http
