import { Role } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Unauthorized", 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError("Forbidden: admin access required", 403));
      return;
    }

    next();
  };
}

export const authorizeAdmin = authorize(Role.ADMIN);
