import { Request, Response, NextFunction } from "express";
import { getAuth, createClerkClient } from "@clerk/express";
import { AppError } from "../utils/AppError";
import { verifyToken, JwtPayload } from "../utils/jwt";
import { prisma } from "../config/prisma";

export type { JwtPayload };

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    next(new AppError("Unauthorized", 401));
    return;
  }

  const token = authHeader.slice(7);

  // 1. Try legacy JWT verification first
  try {
    req.user = verifyToken(token);
    next();
    return;
  } catch {
    // Legacy verification failed, fallback to Clerk
  }

  // 2. Try Clerk verification
  try {
    const auth = getAuth(req);
    console.log("Clerk auth state:", auth);
    // @ts-ignore
    if (auth && typeof auth.debug === "function") {
      // @ts-ignore
      console.log("Clerk Debug Info:", auth.debug());
    }
    if (auth && auth.userId) {
      const clerkId = auth.userId;

      // Find user by clerkId
      let user = await prisma.user.findUnique({
        where: { clerkId },
      });

      if (!user) {
        // Fetch details from Clerk and map them
        const clerkUser = await clerkClient.users.getUser(clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Clerk User";
        const profileImage = clerkUser.imageUrl || null;
        const collegeName = (clerkUser.unsafeMetadata?.collegeName as string) || null;

        if (email) {
          // Check if user exists by email (legacy user)
          user = await prisma.user.findUnique({
            where: { email },
          });

          if (user) {
            if (user.isDeleted || user.deletedAt !== null) {
               next(new AppError("Account deleted", 401));
               return;
            }
            // Link clerkId to existing legacy user safely without changing password
            user = await prisma.user.update({
              where: { id: user.id },
              data: { clerkId, profileImage, isVerified: true, collegeName: user.collegeName || collegeName },
            });
          }
        }

        if (!user) {
          // Create new Clerk user cleanly
          user = await prisma.user.create({
            data: {
              clerkId,
              email: email || `${clerkId}@clerk.local`,
              name,
              profileImage,
              collegeName,
              isVerified: true,
              password: null,
            },
          });
        }
      }

      if (user.isDeleted || user.deletedAt !== null) {
        next(new AppError("Account deleted", 401));
        return;
      }

      req.user = { userId: user.id, role: user.role };
      next();
      return;
    }
  } catch (err) {
    console.error("Clerk authentication middleware error:", err);
  }

  next(new AppError("Invalid or expired token", 401));
}
