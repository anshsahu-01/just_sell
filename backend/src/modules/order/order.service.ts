import { PaymentStatus, Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { CreateOrderBody, UpdateOrderStatusBody } from "./order.validation";

const userSelect = {
  id: true,
  name: true,
  profileImage: true,
  collegeName: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

const productSelect = {
  id: true,
  title: true,
  images: true,
  price: true,
} satisfies Prisma.ProductSelect;

const orderInclude = {
  product: { select: productSelect },
  buyer: { select: userSelect },
  seller: { select: userSelect },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

function formatOrder(order: OrderWithRelations) {
  return {
    ...order,
    amount: Number(order.amount),
  };
}

export async function createOrder(buyerId: string, input: CreateOrderBody) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, userId: true, price: true, status: true, isSold: true },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (product.status === ProductStatus.SOLD || product.isSold) {
    throw new AppError("Product is already sold", 400);
  }

  if (product.userId === buyerId) {
    throw new AppError("You cannot buy your own product", 400);
  }

  const existingOrder = await prisma.order.findFirst({
    where: {
      productId: input.productId,
      buyerId,
      paymentStatus: PaymentStatus.payment_pending,
    },
  });

  if (existingOrder) {
    throw new AppError("You already have an active order for this product", 400);
  }

  const order = await prisma.order.create({
    data: {
      productId: input.productId,
      buyerId,
      sellerId: product.userId,
      amount: product.price,
      paymentMethod: input.paymentMethod,
      paymentStatus: PaymentStatus.payment_pending,
    },
    include: orderInclude,
  });

  return formatOrder(order);
}

export async function getMyOrders(buyerId: string) {
  const orders = await prisma.order.findMany({
    where: { buyerId },
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });

  return orders.map(formatOrder);
}

export async function getMySales(sellerId: string) {
  const orders = await prisma.order.findMany({
    where: { sellerId },
    orderBy: { createdAt: "desc" },
    include: orderInclude,
  });

  return orders.map(formatOrder);
}

export async function updateOrderStatus(
  orderId: string,
  sellerId: string,
  input: UpdateOrderStatusBody
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, sellerId: true, productId: true },
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.sellerId !== sellerId) {
    throw new AppError("You are not authorized to update this order", 403);
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const res = await tx.order.update({
      where: { id: orderId },
      data: { paymentStatus: input.status },
      include: orderInclude,
    });

    if (input.status === PaymentStatus.confirmed) {
      await tx.product.update({
        where: { id: order.productId },
        data: { status: ProductStatus.SOLD, isSold: true },
      });
      // also cancel other pending orders for this product
      await tx.order.updateMany({
        where: {
          productId: order.productId,
          id: { not: orderId },
          paymentStatus: PaymentStatus.payment_pending,
        },
        data: { paymentStatus: PaymentStatus.cancelled },
      });
    }

    return res;
  });

  return formatOrder(updatedOrder);
}
