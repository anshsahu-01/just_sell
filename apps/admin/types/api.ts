export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  collegeName?: string | null;
  createdAt: string;
  products?: { id: string }[];
  ordersAsBuyer?: { id: string }[];
  ordersAsSeller?: { id: string }[];
};

export type AdminListing = {
  id: string;
  title: string;
  price: number;
  status?: string;
  isSold?: boolean;
  isHidden?: boolean;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email?: string;
  };
};

export type AdminOrder = {
  id: string;
  paymentStatus: string;
  createdAt: string;
  amount?: number;
  product?: { id: string; title: string; images?: string[] };
  buyer?: { id: string; name: string; email?: string };
  seller?: { id: string; name: string; email?: string };
  utrNumber?: string | null;
  paymentScreenshot?: string | null;
};