import { Router } from "express";
import { authenticate } from "../../middleware/auth";
import * as adminController from "./admin.controller";

const router = Router();

router.get("/stats", authenticate, adminController.getStats);
router.get("/users", authenticate, adminController.getUsers);
router.get("/products", authenticate, adminController.getProducts);
router.patch("/products/:id/sold", authenticate, adminController.markProductSold);
router.patch("/products/:id/hide", authenticate, adminController.hideProduct);
router.patch("/products/:id/restore", authenticate, adminController.restoreProduct);
router.delete("/products/:id", authenticate, adminController.deleteProduct);
router.get("/orders", authenticate, adminController.getOrders);

router.patch(
	"/orders/:id/approve",
	authenticate,
	adminController.approveOrder
);
router.patch(
	"/orders/:id/reject",
	authenticate,
	adminController.rejectOrder
);

export default router;