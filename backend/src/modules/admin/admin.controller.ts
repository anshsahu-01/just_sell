import { Request, Response } from "express";
import { ProductStatus, PaymentStatus, OrderStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { assertAdminAccess } from "./admin.service";

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  await assertAdminAccess(req);

  const [totalUsers, totalListings, totalOrders, soldListings] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.product.count({ where: { OR: [{ status: "SOLD" }, { isSold: true }] } }),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers,
      totalListings,
      totalOrders,
      activeListings: totalListings - soldListings,
      soldListings,
    },
  });
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  await assertAdminAccess(req);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      collegeName: true,
      createdAt: true,
      products: { select: { id: true } },
      ordersAsBuyer: { select: { id: true } },
      ordersAsSeller: { select: { id: true } },
    },
  });

  res.json({ success: true, data: users });
});

export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  await assertAdminAccess(req);

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      price: true,
      status: true,
      isSold: true,
      isHidden: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res.json({ success: true, data: products });
});

async function getProductOrFail(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, status: true, isSold: true, isHidden: true },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return product;
}

export const markProductSold = asyncHandler(async (req: Request, res: Response) => {
  await assertAdminAccess(req);
  const { id } = req.params;

  await getProductOrFail(id);

  const updated = await prisma.product.update({
    where: { id },
    data: {
      status: ProductStatus.SOLD,
      isSold: true,
      isHidden: false,
    },
  });

  res.json({ success: true, data: updated });
});

export const hideProduct = asyncHandler(async (req: Request, res: Response) => {
  await assertAdminAccess(req);
  const { id } = req.params;

  await getProductOrFail(id);

  const updated = await prisma.product.update({
    where: { id },
    data: {
      status: ProductStatus.HIDDEN,
      isHidden: true,
    },
  });

  res.json({ success: true, data: updated });
});

export const restoreProduct = asyncHandler(async (req: Request, res: Response) => {
  await assertAdminAccess(req);
  const { id } = req.params;

  const product = await getProductOrFail(id);

  if (product.status !== ProductStatus.HIDDEN) {
    throw new AppError("Only hidden listings can be restored", 400);
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      status: ProductStatus.ACTIVE,
      isHidden: false,
      isSold: false,
    },
  });

  res.json({ success: true, data: updated });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  await assertAdminAccess(req);
  const { id } = req.params;

  await getProductOrFail(id);

  await prisma.product.delete({ where: { id } });

  res.json({ success: true, data: { id } });
});

export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  await assertAdminAccess(req);
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      paymentStatus: true,
      createdAt: true,
      utrNumber: true,
      paymentScreenshot: true,
      product: { select: { id: true, title: true, images: true, price: true } },
      buyer: { select: { id: true, name: true, email: true } },
      seller: { select: { id: true, name: true, email: true } },
    },
  });

  const formatted = orders.map((o) => ({
    ...o,
    amount: Number(o.amount),
  }));

  res.json({ success: true, data: formatted });
});

export const approveOrder = asyncHandler(async (req: Request, res: Response) => {
  await assertAdminAccess(req);
  const { id } = req.params;

  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) throw new AppError("Order not found", 404);

    const confirmed = await tx.order.update({
      where: { id },
      data: { paymentStatus: PaymentStatus.confirmed, orderStatus: OrderStatus.processing },
      include: { product: true, buyer: true, seller: true },
    });

    await tx.product.update({ where: { id: confirmed.productId }, data: { status: ProductStatus.SOLD, isSold: true } });

    await tx.order.updateMany({
      where: { productId: confirmed.productId, id: { not: id }, orderStatus: OrderStatus.pending },
      data: { paymentStatus: PaymentStatus.cancelled, orderStatus: OrderStatus.cancelled },
    });

    return confirmed;
  });

  res.json({ success: true, data: updated });
});

export const rejectOrder = asyncHandler(async (req: Request, res: Response) => {
  await assertAdminAccess(req);
  const { id } = req.params;

  const updated = await prisma.order.update({
    where: { id },
    data: { paymentStatus: PaymentStatus.cancelled, orderStatus: OrderStatus.cancelled },
    include: { product: true, buyer: true, seller: true },
  });

  res.json({ success: true, data: updated });
});