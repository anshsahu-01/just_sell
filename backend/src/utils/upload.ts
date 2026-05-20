import { Readable } from "stream";
import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../config/cloudinary";
import { AppError } from "./AppError";

const PRODUCT_IMAGES_FOLDER = "becho/products";

export async function uploadImageBuffer(
  buffer: Buffer,
  folder: string = PRODUCT_IMAGES_FOLDER
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result.secure_url);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function uploadImages(
  files: Express.Multer.File[],
  folder: string = PRODUCT_IMAGES_FOLDER
): Promise<string[]> {
  try {
    return await Promise.all(
      files.map((file) => uploadImageBuffer(file.buffer, folder))
    );
  } catch {
    throw new AppError("Failed to upload images", 500);
  }
}

export async function deleteImageFromCloudinary(url: string): Promise<void> {
  try {
    // Basic safeguard: skip deletion if the URL doesn't look like a cloudinary URL or if it's a default avatar
    if (!url.includes("cloudinary.com") || url.includes("default") || url.includes("avatar")) {
      console.log(`Skipping deletion for non-cloudinary or default image: ${url}`);
      return;
    }

    const segments = url.split("/");
    const filename = segments.pop();
    if (!filename) return;
    const publicIdWithFolder = segments.pop() + "/" + filename.split(".")[0];
    const publicId = publicIdWithFolder;

    await cloudinary.uploader.destroy(publicId);
    console.log(`Successfully deleted Cloudinary image: ${publicId}`);
  } catch (error) {
    console.warn(`Failed to delete old image from Cloudinary: ${url}`, error);
  }
}
