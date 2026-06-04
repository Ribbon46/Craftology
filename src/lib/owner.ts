// Platform owner(s) — listings they own check out to the platform account (no
// commission split), and they can list without the seller-onboarding flow.
// Configured via ADMIN_USER_IDS (comma-separated profile ids); defaults to the
// founding Deco Kubik owner.
export function platformOwnerIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? '3f6538a6-af42-48fe-99b3-56ed9fbcaf08')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isPlatformOwner(userId: string): boolean {
  return platformOwnerIds().includes(userId);
}
