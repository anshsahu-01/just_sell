import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { handleProfileImageUpload, processProfileImage } from "../../middleware/upload";
import * as userController from "./user.controller";
import { updateProfileSchema, deleteAccountSchema } from "./user.validation";

const router = Router();

// Rate limiters per requirements
const profileEditLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: "Too many profile update requests, please try again later." },
});

const accountDeleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, message: "Too many delete requests, please try again later." },
});

router.get("/me", authenticate, userController.getMe);

router.patch(
  "/me",
  authenticate,
  profileEditLimiter,
  handleProfileImageUpload,
  processProfileImage,
  validate(updateProfileSchema),
  userController.updateProfile
);

router.delete(
  "/me",
  authenticate,
  accountDeleteLimiter,
  validate(deleteAccountSchema),
  userController.deleteAccount
);

export default router;
