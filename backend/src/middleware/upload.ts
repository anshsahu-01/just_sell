import { Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import { AppError } from "../utils/AppError";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadImages } from "../utils/upload";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

const productImageMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new AppError("Only JPEG, PNG, and WebP images are allowed", 400));
  },
}).array("images", MAX_FILES);

const profileImageMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new AppError("Only JPEG, PNG, and WebP images are allowed", 400));
  },
}).single("profileImage");

export function handleProductImageUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  productImageMulter(req, res, (error) => {
    if (error instanceof MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new AppError("Each image must be smaller than 5MB", 400));
        return;
      }
      if (error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE") {
        next(new AppError(`You can upload up to ${MAX_FILES} images`, 400));
        return;
      }
      next(new AppError(error.message, 400));
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
}

export const processProductImages = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files?.length) {
      throw new AppError("At least one product image is required", 400);
    }

    req.uploadedImageUrls = await uploadImages(files);
    next();
  }
);

export const processOptionalProductImages = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files?.length) {
      req.uploadedImageUrls = [];
      next();
      return;
    }

    req.uploadedImageUrls = await uploadImages(files);
    next();
  }
);

export function handleProfileImageUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  profileImageMulter(req, res, (error) => {
    if (error instanceof MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new AppError("Profile image must be smaller than 5MB", 400));
        return;
      }
      next(new AppError(error.message, 400));
      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
}

export const processProfileImage = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      next();
      return;
    }

    const urls = await uploadImages([file], "becho/profiles");
    req.uploadedImageUrls = urls;
    next();
  }
);
