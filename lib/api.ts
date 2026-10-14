import type {
  ApiResponse,
  KasExpense,
  KasPaymentToggle,
  KasWeek,
  MatrixResponse,
  OverviewData,
  PaginatedResponse,
  WeekStudentsResponse,
} from "@/types/types";

const BASE_URL = "https://nara.trivox.id/api";
// const BASE_URL = "http://localhost:8000/api";

const STORAGE_BASE = "https://nara.trivox.id/storage";
// const STORAGE_BASE = "http://localhost:8000/storage";

/**
 * Build a full public URL for a Laravel storage path.
 * If the path is already a full URL, returns it as-is.
 */
export function getStorageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${STORAGE_BASE}/${path}`;
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      error.message || `Request failed with status ${res.status}`
    );
  }

  return res.json();
}

// ──────────────────────────────────────
// Overview
// ──────────────────────────────────────
export async function getOverview() {
  return request<ApiResponse<OverviewData>>("/kas/overview");
}

// ──────────────────────────────────────
// Weeks
// ──────────────────────────────────────
export async function getWeeks(params?: {
  year?: number;
  month?: number;
  type?: "routine" | "incidental";
}) {
  const searchParams = new URLSearchParams();
  if (params?.year) searchParams.set("year", String(params.year));
  if (params?.month) searchParams.set("month", String(params.month));
  if (params?.type) searchParams.set("type", params.type);
  const qs = searchParams.toString();
  return request<ApiResponse<KasWeek[]>>(`/kas/weeks${qs ? `?${qs}` : ""}`);
}

export async function createWeek(
  data: Omit<KasWeek, "id" | "created_at" | "updated_at" | "paid_count" | "total_collected">
) {
  return request<ApiResponse<KasWeek>>("/kas/weeks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWeek(id: number, data: Partial<KasWeek>) {
  return request<ApiResponse<KasWeek>>(`/kas/weeks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteWeek(id: number) {
  return request<ApiResponse<null>>(`/kas/weeks/${id}`, {
    method: "DELETE",
  });
}

// ──────────────────────────────────────
// Payments
// ──────────────────────────────────────
export async function getWeekStudents(
  weekId: number,
  search?: string
) {
  const searchParams = new URLSearchParams();
  if (search) searchParams.set("search", search);
  const qs = searchParams.toString();
  return request<WeekStudentsResponse>(
    `/kas/weeks/${weekId}/students${qs ? `?${qs}` : ""}`
  );
}

export async function togglePayment(data: {
  student_id: number;
  kas_week_id: number;
  payment_method?: "cash" | "qris";
  status?: "paid" | "unpaid";
  notes?: string;
}) {
  return request<ApiResponse<KasPaymentToggle>>("/kas/toggle-payment", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ──────────────────────────────────────
// Expenses
// ──────────────────────────────────────
export async function getExpenses(params?: {
  page?: number;
  per_page?: number;
  search?: string;
  year?: number;
  month?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.per_page)
    searchParams.set("per_page", String(params.per_page));
  if (params?.search) searchParams.set("search", params.search);
  if (params?.year) searchParams.set("year", String(params.year));
  if (params?.month) searchParams.set("month", String(params.month));
  const qs = searchParams.toString();
  return request<PaginatedResponse<KasExpense>>(
    `/kas/expenses${qs ? `?${qs}` : ""}`
  );
}

export async function createExpense(data: {
  title: string;
  amount: number;
  expense_date: string;
  receipt_image?: File;
  notes?: string;
}) {
  const formData = new FormData();
  formData.append("title", data.title);
  formData.append("amount", String(data.amount));
  formData.append("expense_date", data.expense_date);
  if (data.receipt_image) {
    formData.append("receipt_image", data.receipt_image);
  }
  if (data.notes) {
    formData.append("notes", data.notes);
  }

  const url = `${BASE_URL}/kas/expenses`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      error.message || `Request failed with status ${res.status}`
    );
  }

  return res.json() as Promise<ApiResponse<KasExpense>>;
}

export async function updateExpense(
  id: number,
  data: Partial<{
    title: string;
    amount: number;
    expense_date: string;
    receipt_image: File;
    notes: string;
  }>
) {
  const formData = new FormData();
  // Laravel method spoofing: POST + _method=PUT for multipart/form-data
  formData.append("_method", "PUT");
  if (data.title !== undefined) formData.append("title", data.title);
  if (data.amount !== undefined) formData.append("amount", String(data.amount));
  if (data.expense_date !== undefined) formData.append("expense_date", data.expense_date);
  if (data.receipt_image) formData.append("receipt_image", data.receipt_image);
  if (data.notes !== undefined) formData.append("notes", data.notes);

  const url = `${BASE_URL}/kas/expenses/${id}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(
      error.message || `Request failed with status ${res.status}`
    );
  }

  return res.json() as Promise<ApiResponse<KasExpense>>;
}

export async function deleteExpense(id: number) {
  return request<ApiResponse<null>>(`/kas/expenses/${id}`, {
    method: "DELETE",
  });
}

// ──────────────────────────────────────
// Matrix
// ──────────────────────────────────────
export async function getMatrix(params?: {
  month?: number;
  year?: number;
  limit_weeks?: number;
  type?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.month) searchParams.set("month", String(params.month));
  if (params?.year) searchParams.set("year", String(params.year));
  if (params?.limit_weeks)
    searchParams.set("limit_weeks", String(params.limit_weeks));
  if (params?.type) searchParams.set("type", params.type);
  const qs = searchParams.toString();
  return request<MatrixResponse>(`/kas/matrix${qs ? `?${qs}` : ""}`);
}
