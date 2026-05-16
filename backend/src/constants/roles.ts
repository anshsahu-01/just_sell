import { Role } from "@prisma/client";

export { Role };

export const ROLES = {
  USER: Role.USER,
  ADMIN: Role.ADMIN,
} as const;
