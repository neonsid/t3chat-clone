import { cronJobs } from "convex/server"

import { internal } from "./_generated/api"

const crons = cronJobs()

crons.interval(
  "gc unbound attachments",
  { hours: 1 },
  internal.attachments.gcOrphans,
  {}
)

export default crons
