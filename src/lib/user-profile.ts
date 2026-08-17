export const FALLBACK_PROFILE_DISPLAY_NAME = "Account"

export type UserProfileSource = {
  fullName: string | null
  firstName: string | null
  imageUrl: string
  hasImage: boolean
  primaryEmailAddress: { emailAddress: string } | null
}

export type UserProfileInfo = {
  displayName: string
  email: string
  initial: string
  imageUrl: string | null
}

export function getUserProfileInfo(
  user: UserProfileSource | null | undefined
): UserProfileInfo {
  const email = user?.primaryEmailAddress?.emailAddress ?? ""
  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.primaryEmailAddress?.emailAddress ??
    FALLBACK_PROFILE_DISPLAY_NAME

  return {
    displayName,
    email,
    initial: displayName.charAt(0).toUpperCase(),
    imageUrl: user?.hasImage ? user.imageUrl : null,
  }
}
