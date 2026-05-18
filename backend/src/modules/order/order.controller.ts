import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { getValidated } from "../../middleware/validate";
import * as orderService from "./order.service";
import { CreateOrderBody, UpdateOrderStatusBody } from "./order.validation";

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await orderService.createOrder(
    req.user!.userId,
    getValidated<CreateOrderBody>(req, "body")
  );
  res.status(201).json({ success: true, data: order });
});

export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
  const orders = await orderService.getMyOrders(req.user!.userId);
  res.json({ success: true, data: orders });
});

export const getMySales = asyncHandler(async (req: Request, res: Response) => {
  const sales = await orderService.getMySales(req.user!.userId);
  res.json({ success: true, data: sales });
});

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = getValidated<{ id: string }>(req, "params");
  const order = await orderService.updateOrderStatus(
    id,
    req.user!.userId,
    getValidated<UpdateOrderStatusBody>(req, "body")
  );
  res.json({ success: true, data: order });
});
