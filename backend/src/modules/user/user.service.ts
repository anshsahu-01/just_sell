import { createClerkClient } from "@clerk/express";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { deleteImageFromCloudinary } from "../../utils/upload";
import { UpdateProfileInput, DeleteAccountInput } from "./user.validation";

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
  uploadedImageUrls?: string[]
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  if (user.isDeleted || user.name === "Deleted User") {
    throw new AppError("Action not permitted on deleted account", 403);
  }

  const email = input.email?.trim().toLowerCase();
  
  if (email && email !== user.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new AppError("Email already in use", 400);
    }
  }

  const profileImage = uploadedImageUrls?.[0] || user.profileImage;
  const bio = input.bio?.trim();
  const mobileNumber = input.mobileNumber?.trim();
  const name = input.name?.trim() || user.name;
  
  const isEmailChanged = email && email !== user.email;

  const updateData = {
    name,
    email: email || user.email,
    mobileNumber: mobileNumber ?? user.mobileNumber,
    bio: bio ?? user.bio,
    profileImage,
    ...(isEmailChanged ? { isVerified: false } : {}),
  };

  if (user.clerkId) {
    try {
      const nameParts = name.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      await clerkClient.users.updateUser(user.clerkId, {
        firstName,
        lastName,
      });

      // We do not directly update Clerk email here because Clerk has its own verification flows,
      // but if we are enforcing a local email change, we can attempt it, or rely strictly on local state.
      // Usually, it's safer to just update metadata or let the client handle email via Clerk SDK,
      // but since we allow it in our API, we'll try to sync if possible.
      // Note: Clerk requires explicit email addition/verification. We'll skip email sync to avoid API rejection,
      // relying on the frontend to manage Clerk email verification separately if needed.
    } catch (err) {
      console.error("Clerk sync error during profile update:", err);
      throw new AppError("Failed to sync profile with authentication provider", 500);
    }
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    return await tx.user.update({
      where: { id: userId },
      data: updateData,
    });
  });

  // If a new image was uploaded and there was an old one, delete the old one
  if (uploadedImageUrls?.[0] && user.profileImage && user.profileImage !== uploadedImageUrls[0]) {
    // Non-blocking cleanup
    deleteImageFromCloudinary(user.profileImage).catch((err) =>
      console.warn("Non-fatal: failed to delete old profile image", err)
    );
  }

  console.log(`[AUDIT] User profile updated: ${userId}`, isEmailChanged ? "Email changed" : "");

  return updatedUser;
}

export async function deleteAccount(userId: string, input: DeleteAccountInput) {
  if (input.confirmation !== "DELETE") {
    throw new AppError("Invalid confirmation text", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ordersAsSeller: {
        where: {
          paymentStatus: { in: ["payment_pending"] },
        },
      },
      ordersAsBuyer: {
        where: {
          paymentStatus: { in: ["payment_pending"] },
        },
      },
    },
  });

  if (!user) throw new AppError("User not found", 404);

  if (user.isDeleted || user.name === "Deleted User") {
    // Idempotency: Return success if already deleted
    return { success: true, message: "Account already deleted" };
  }

  if (user.ordersAsSeller.length > 0 || user.ordersAsBuyer.length > 0) {
    throw new AppError("Cannot delete account with pending active orders", 400);
  }

  // 1. Delete from Clerk First
  if (user.clerkId) {
    try {
      await clerkClient.users.deleteUser(user.clerkId);
    } catch (err) {
      console.error(`CRITICAL: Clerk account deletion failed for clerkId ${user.clerkId}`, err);
      throw new AppError("Failed to remove authentication record. Account deletion aborted.", 500);
    }
  }

  // 2. Anonymize Prisma Record in Transaction
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          name: "Deleted User",
          email: `deleted_${Date.now()}@deleted.local`,
          clerkId: null,
          profileImage: null,
          bio: null,
          mobileNumber: null,
          isVerified: false,
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    });
  } catch (err) {
    console.error(`CRITICAL: Prisma anonymization failed AFTER Clerk deletion for userId ${userId}`, err);
    throw new AppError("Account authentication removed, but local profile anonymization failed.", 500);
  }

  console.log(`[AUDIT] User account securely anonymized and deleted: ${userId}`);
  
  return { success: true, message: "Account securely deleted" };
}
