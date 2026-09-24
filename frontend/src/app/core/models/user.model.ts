export const USER_ROLES = ['ADMIN', 'MODERATOR', 'USER'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio: string;
  avatarUrl: string | null;
  role: UserRole;
}

export function hasRole(role: UserRole | null | undefined, allowed: readonly UserRole[]): boolean {
  return role != null && allowed.includes(role);
}
