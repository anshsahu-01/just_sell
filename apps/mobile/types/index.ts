export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  collegeName: string | null;
  isVerified: boolean;
  role: Role;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  name: string;
  profileImage: string | null;
  collegeName: string | null;
  isVerified: boolean;
}

export type Seller = PublicUser;

export type ProductStatus = "ACTIVE" | "SOLD" | "HIDDEN";

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  images: string[];
  isSold: boolean;
  status: ProductStatus;
  createdAt: string;
  categoryId: string;
  userId: string;
  seller: Seller;
  category: Pick<Category, "id" | "name">;
}

export interface MyProductsResponse {
  active: Product[];
  sold: Product[];
}

export interface ConversationListItem {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string | null;
  otherUser: PublicUser;
  lastMessage: {
    content: string;
    createdAt: string;
    isMine: boolean;
  } | null;
  lastMessageAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  isMine: boolean;
  sender: PublicUser;
}

export interface ConversationDetail {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string | null;
  productPrice: number;
  isSold: boolean;
  otherUser: PublicUser;
  messages: ChatMessage[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  collegeName?: string;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  condition?: string;
  sort?: "latest" | "price_asc" | "price_desc";
}

export interface CreateProductInput {
  title: string;
  description: string;
  price: string;
  condition: string;
  categoryId: string;
  imageUris: string[];
}

export type PaymentMethod = "COD" | "UPI";

export type PaymentStatus = "payment_pending" | "confirmed" | "cancelled";

export interface Order {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
  product: Pick<Product, "id" | "title" | "images" | "price">;
  buyer: PublicUser;
  seller: PublicUser;
}

