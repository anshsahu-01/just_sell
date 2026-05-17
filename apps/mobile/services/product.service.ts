import {
  ApiResponse,
  CreateProductInput,
  MyProductsResponse,
  Product,
  ProductFilters,
  ProductStatus,
} from "@/types";
import { apiRequest } from "./api";

export async function getProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.append(key, String(value));
    }
  });

  const query = params.toString();
  const res = await apiRequest<ApiResponse<Product[]>>(
    `/products${query ? `?${query}` : ""}`
  );

  const products = Array.isArray(res.data) ? res.data : [];

  return { products, pagination: res.pagination };
}

export async function getProductById(id: string) {
  const res = await apiRequest<ApiResponse<Product>>(`/products/${id}`);
  return res.data;
}

export async function createProduct(input: CreateProductInput, token: string) {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description);
  formData.append("price", input.price);
  formData.append("condition", input.condition);
  formData.append("categoryId", input.categoryId);

  input.imageUris.forEach((uri, index) => {
    formData.append("images", {
      uri,
      type: "image/jpeg",
      name: `product-${index}.jpg`,
    } as unknown as Blob);
  });

  const res = await apiRequest<ApiResponse<Product>>("/products", {
    method: "POST",
    body: formData,
    token,
    isFormData: true,
  });

  return res.data;
}

export async function updateProduct(
  id: string,
  input: CreateProductInput & { existingImages?: string[] },
  token: string
) {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description);
  formData.append("price", input.price);
  formData.append("condition", input.condition);
  formData.append("categoryId", input.categoryId);
  formData.append("existingImages", JSON.stringify(input.existingImages ?? []));

  input.imageUris.forEach((uri, index) => {
    formData.append("images", {
      uri,
      type: "image/jpeg",
      name: `product-${index}.jpg`,
    } as unknown as Blob);
  });

  const res = await apiRequest<ApiResponse<Product>>(`/products/${id}`, {
    method: "PATCH",
    body: formData,
    token,
    isFormData: true,
  });

  return res.data;
}

export async function getMyProducts(token: string) {
  const res = await apiRequest<ApiResponse<MyProductsResponse>>("/products/me", {
    token,
  });
  return res.data;
}

export async function updateProductStatus(
  id: string,
  status: ProductStatus,
  token: string
) {
  const res = await apiRequest<ApiResponse<Product>>(`/products/${id}/status`, {
    method: "PATCH",
    body: { status },
    token,
  });
  return res.data;
}

export async function deleteProduct(id: string, token: string) {
  await apiRequest(`/products/${id}`, {
    method: "DELETE",
    token,
  });
}
