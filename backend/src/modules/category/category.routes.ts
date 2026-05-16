import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import { authorizeAdmin } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import * as categoryController from "./category.controller";
import { createCategorySchema } from "./category.validation";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizeAdmin,
  validate(createCategorySchema),
  categoryController.createCategory
);

router.get("/", categoryController.getAllCategories);

export default router;
