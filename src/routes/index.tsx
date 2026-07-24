import { useState } from "react"
import type { FormEvent } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { Check, LoaderCircle, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { api } from "../../convex/_generated/api"
import { Chat } from "@/components/Chat"

export const Route = createFileRoute("/")({ component: App })

function App() {

  return (
    <Chat />
  )
}
