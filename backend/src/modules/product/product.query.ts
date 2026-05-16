import { Prisma } from "@prisma/client";
import { GetProductsQuery } from "./product.validation";

export function buildProductWhere(
  query: GetProductsQuery
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (query.search) {
    where.title = {
      contains: query.search,
      mode: "insensitive",
    };
  }

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  if (query.condition) {
    where.condition = {
      equals: query.condition,
      mode: "insensitive",
    };
  }

  return where;
}

export function buildProductOrderBy(
  sort: GetProductsQuery["sort"]
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "latest":
    default:
      return { createdAt: "desc" };
  }
}
