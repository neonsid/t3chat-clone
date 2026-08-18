import { describe, expect, it } from "vitest"

import {
  FALLBACK_PROFILE_DISPLAY_NAME,
  getUserProfileInfo,
} from "@/lib/user-profile"
import type { UserProfileSource } from "@/lib/user-profile"

function profileSource(
  overrides: Partial<UserProfileSource> = {}
): UserProfileSource {
  return {
    fullName: null,
    firstName: null,
    imageUrl: "https://img.example/avatar.png",
    hasImage: false,
    primaryEmailAddress: null,
    ...overrides,
  }
}

describe("getUserProfileInfo", () => {
  it("prefers full name, then first name, then email", () => {
    expect(
      getUserProfileInfo(
        profileSource({
          fullName: "Siddharth Methiya",
          firstName: "Siddharth",
          primaryEmailAddress: { emailAddress: "sid@example.com" },
        })
      ).displayName
    ).toBe("Siddharth Methiya")

    expect(
      getUserProfileInfo(
        profileSource({
          firstName: "Siddharth",
          primaryEmailAddress: { emailAddress: "sid@example.com" },
        })
      ).displayName
    ).toBe("Siddharth")

    expect(
      getUserProfileInfo(
        profileSource({
          primaryEmailAddress: { emailAddress: "sid@example.com" },
        })
      ).displayName
    ).toBe("sid@example.com")
  })

  it("falls back when Clerk has not loaded a user", () => {
    expect(getUserProfileInfo(null)).toEqual({
      displayName: FALLBACK_PROFILE_DISPLAY_NAME,
      email: "",
      initial: "A",
      imageUrl: null,
    })
  })

  it("exposes email, initial, and avatar independently of the display name", () => {
    expect(
      getUserProfileInfo(
        profileSource({
          fullName: "siddharth methiya",
          hasImage: true,
          primaryEmailAddress: { emailAddress: "sid@example.com" },
        })
      )
    ).toEqual({
      displayName: "siddharth methiya",
      email: "sid@example.com",
      initial: "S",
      imageUrl: "https://img.example/avatar.png",
    })
  })
})
