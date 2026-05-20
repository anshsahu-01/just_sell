import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import categoryRoutes from "../modules/category/category.routes";
import chatRoutes from "../modules/chat/chat.routes";
import productRoutes from "../modules/product/product.routes";
import orderRoutes from "../modules/order/order.routes";
import userRoutes from "../modules/user/user.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "Server is running" });
});

router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/products", productRoutes);
router.use("/chats", chatRoutes);
router.use("/orders", orderRoutes);
router.use("/users", userRoutes);

export default router;
