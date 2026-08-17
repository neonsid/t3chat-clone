import migrations from "@convex-dev/migrations/convex.config.js"
import r2 from "@convex-dev/r2/convex.config.js"
import { defineApp } from "convex/server"

const app = defineApp()
app.use(migrations)
app.use(r2)

export default app
