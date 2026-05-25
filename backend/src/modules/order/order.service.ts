import { OrderStatus, PaymentStatus, Prisma, ProductStatus } from "@prisma/client";
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
      utrNumber: input.utrNumber ?? null,
      paymentScreenshot: input.paymentScreenshot ?? null,
      orderStatus: OrderStatus.pending,
      mobileNumber: input.mobileNumber,
      locationDetails: input.locationDetails,
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
  actorId: string,
  input: UpdateOrderStatusBody
) {
  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        productId: true,
        paymentStatus: true,
        orderStatus: true,
      },
    });

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    const isSeller = order.sellerId === actorId;
    const isBuyer = order.buyerId === actorId;

    if (!isSeller && !isBuyer) {
      throw new AppError("You are not authorized to update this order", 403);
    }

    if (input.status === PaymentStatus.confirmed) {
      if (!isSeller) {
        throw new AppError("Only the seller can confirm this order", 403);
      }

      if (order.orderStatus !== OrderStatus.pending) {
        throw new AppError("Only pending orders can be confirmed", 400);
      }

      const product = await tx.product.findUnique({
        where: { id: order.productId },
        select: { id: true, status: true, isSold: true },
      });

      if (!product) {
        throw new AppError("Product not found", 404);
      }

      if (product.status === ProductStatus.SOLD || product.isSold) {
        throw new AppError("This product has already been marked as sold", 400);
      }

      const confirmedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.confirmed,
          orderStatus: OrderStatus.processing,
        },
        include: orderInclude,
      });

      await tx.product.update({
        where: { id: order.productId },
        data: { status: ProductStatus.SOLD, isSold: true },
      });

      await tx.order.updateMany({
        where: {
          productId: order.productId,
          id: { not: orderId },
          orderStatus: OrderStatus.pending,
        },
        data: {
          paymentStatus: PaymentStatus.cancelled,
          orderStatus: OrderStatus.cancelled,
        },
      });

      return confirmedOrder;
    }

    if (input.status === "shipped") {
      if (!isSeller) {
        throw new AppError("Only the seller can mark this order as shipped", 403);
      }

      if (order.orderStatus !== OrderStatus.processing) {
        throw new AppError("Only processing orders can be marked as shipped", 400);
      }

      return tx.order.update({
        where: { id: orderId },
        data: { orderStatus: OrderStatus.shipped },
        include: orderInclude,
      });
    }

    if (input.status === "delivered") {
      if (!isSeller) {
        throw new AppError("Only the seller can mark this order as delivered", 403);
      }

      if (order.orderStatus !== OrderStatus.shipped) {
        throw new AppError("Only shipped orders can be marked as delivered", 400);
      }

      return tx.order.update({
        where: { id: orderId },
        data: { orderStatus: OrderStatus.delivered },
        include: orderInclude,
      });
    }

    if (
      order.orderStatus !== OrderStatus.pending &&
      order.orderStatus !== OrderStatus.processing
    ) {
      throw new AppError("Completed, shipped, or cancelled orders cannot be cancelled", 400);
    }

    if (!isSeller && !isBuyer) {
      throw new AppError("You are not authorized to cancel this order", 403);
    }

    const cancelledOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.cancelled,
        orderStatus: OrderStatus.cancelled,
      },
      include: orderInclude,
    });

    if (order.orderStatus === OrderStatus.processing) {
      await tx.product.update({
        where: { id: order.productId },
        data: { status: ProductStatus.ACTIVE, isSold: false },
      });
    }

    return cancelledOrder;
  });

  return formatOrder(updatedOrder);
}
