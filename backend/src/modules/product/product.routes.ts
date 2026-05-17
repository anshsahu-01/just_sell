import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import {
  handleProductImageUpload,
  processOptionalProductImages,
  processProductImages,
} from "../../middleware/upload";
import { validate } from "../../middleware/validate";
import * as productController from "./product.controller";
import {
  createProductSchema,
  getProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
  updateProductStatusSchema,
} from "./product.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  handleProductImageUpload,
  processProductImages,
  validate(createProductSchema),
  productController.createProduct
);

router.get(
  "/me",
  authenticate,
  productController.getMyProducts
);

router.get(
  "/",
  validate(getProductsQuerySchema, "query"),
  productController.getAllProducts
);

router.get(
  "/:id",
  validate(productIdParamSchema, "params"),
  productController.getProductById
);

router.patch(
  "/:id",
  authenticate,
  handleProductImageUpload,
  processOptionalProductImages,
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  productController.updateProduct
);

router.patch(
  "/:id/status",
  authenticate,
  validate(productIdParamSchema, "params"),
  validate(updateProductStatusSchema),
  productController.updateProductStatus
);

router.delete(
  "/:id",
  authenticate,
  validate(productIdParamSchema, "params"),
  productController.deleteProduct
);

export default router;
