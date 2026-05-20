import { apiRequest } from "@/services/api";

export async function getMe(token?: string) {
  return apiRequest<{ success: boolean; data: any }>("/users/me", { token });
}

export async function updateProfile(data: any, token?: string) {
  return apiRequest<{ success: boolean; data: any }>("/users/me", {
    method: "PATCH",
    body: data,
    token,
    isFormData: true, // always send as FormData from the edit screen
  });
}

export async function deleteAccount(
  data: { confirmation: string },
  token?: string
) {
  return apiRequest<{ success: boolean; message: string }>("/users/me", {
    method: "DELETE",
    body: data,
    token,
  });
}
