import { Role } from './shared/enums';

export const ROLE_HOME: Record<Role, string> = {
  [Role.TEACHER]: '/dashboard',
  [Role.RECRUITER]: '/recruiter/dashboard',
  [Role.ADMIN]: '/admin',
};

export function getRoleHome(role: Role): string {
  return ROLE_HOME[role] ?? '/dashboard';
}
