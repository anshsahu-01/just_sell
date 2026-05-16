import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { verifyToken, JwtPayload } from "../utils/jwt";

export type { JwtPayload };

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next(new AppError("Unauthorized", 401));
    return;
  }

  const token = authHeader.slice(7);

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}
