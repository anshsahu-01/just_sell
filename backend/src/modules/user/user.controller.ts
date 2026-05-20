import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import * as userService from "./user.service";
import { prisma } from "../../config/prisma";
import { getValidated } from "../../middleware/validate";
import { UpdateProfileInput, DeleteAccountInput } from "./user.validation";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      profileImage: true,
      collegeName: true,
      isVerified: true,
      role: true,
      createdAt: true,
      mobileNumber: true,
      bio: true,
      isDeleted: true,
      deletedAt: true,
    },
  });

  res.json({ success: true, data: user });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const input = getValidated<UpdateProfileInput>(req, "body");
  const uploadedImageUrls = req.uploadedImageUrls;

  const user = await userService.updateProfile(userId, input, uploadedImageUrls);
  res.json({ success: true, data: user });
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const input = getValidated<DeleteAccountInput>(req, "body");

  const result = await userService.deleteAccount(userId, input);
  res.json(result);
});
