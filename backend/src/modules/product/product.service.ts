import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/AppError";
import { getPaginationMeta, PaginationMeta } from "../../utils/pagination";
import { buildProductOrderBy, buildProductWhere } from "./product.query";
import { CreateProductInput, GetProductsQuery } from "./product.validation";

const sellerSelect = {
  id: true,
  name: true,
  profileImage: true,
  collegeName: true,
  isVerified: true,
} satisfies Prisma.UserSelect;

const categorySelect = {
  id: true,
  name: true,
} satisfies Prisma.CategorySelect;

const productInclude = {
  user: { select: sellerSelect },
  category: { select: categorySelect },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

function formatProduct(product: ProductWithRelations) {
  const { user, ...rest } = product;
  return {
    ...rest,
    price: Number(rest.price),
    seller: user,
  };
}

async function ensureCategoryExists(categoryId: string): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }
}

export async function createProduct(userId: string, input: CreateProductInput) {
  await ensureCategoryExists(input.categoryId);

  const product = await prisma.product.create({
    data: {
      title: input.title,
      description: input.description,
      price: input.price,
      condition: input.condition,
      images: input.images,
      categoryId: input.categoryId,
      userId,
    },
    include: productInclude,
  });

  return formatProduct(product);
}

export async function getAllProducts(query: GetProductsQuery) {
  const { page, limit, sort } = query;
  const skip = (page - 1) * limit;
  const where = buildProductWhere(query);
  const orderBy = buildProductOrderBy(sort);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: productInclude,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products: products.map(formatProduct),
    pagination: getPaginationMeta(page, limit, total) satisfies PaginationMeta,
  };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return formatProduct(product);
}

export async function deleteProduct(id: string, userId: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  if (product.userId !== userId) {
    throw new AppError("You are not allowed to delete this product", 403);
  }

  await prisma.product.delete({ where: { id } });
}
