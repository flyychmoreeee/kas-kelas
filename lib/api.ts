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

const BASE_URL = "/backend-api";
// const BASE_URL = "http://localhost:8000/api";

const STORAGE_BASE = "/backend-storage";
// const STORAGE_BASE = "http://localhost:8000/storage";

/**
 * Build a full public URL for a Laravel storage path.
 * If the path is already a full URL, returns it as-is.
 */
export function getStorageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${STORAGE_BASE}/${path}`;
}

export interface RequestOptions extends RequestInit {
  retries?: number;
  timeout?: number;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Check if HTTP status code indicates a temporary or server issue that can be retried.
 */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const maxAttempts = options?.retries ?? DEFAULT_RETRIES;
  const timeoutMs = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const hasBody = options?.body !== undefined;
  const isFormData = typeof FormData !== "undefined" && options?.body instanceof FormData;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    let isTimeout = false;
    let timer: NodeJS.Timeout | undefined;

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        isTimeout = true;
        controller.abort();
      }, timeoutMs);
    }

    // Link external abort signal if provided
    const externalSignal = options?.signal;
    const handleExternalAbort = () => {
      controller.abort();
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener("abort", handleExternalAbort, { once: true });
      }
    }

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(hasBody && !isFormData ? { "Content-Type": "application/json" } : {}),
          ...options?.headers,
        },
      });

      if (!res.ok) {
        // If temporary server error / rate limit and still has attempts left, retry
        if (isRetryableStatus(res.status) && attempt < maxAttempts) {
          console.warn(
            `[API] Request ke ${endpoint} gagal (Status ${res.status}). Mencoba lagi (${attempt}/${maxAttempts})...`
          );
          const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
          await sleep(backoffDelay);
          continue;
        }

        // If client error (4xx) or final attempt, throw the error directly without retry
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.message || `Request failed with status ${res.status}`
        );
      }

      return await res.json();
    } catch (err: any) {
      // If manually cancelled from outside, do not retry
      if (externalSignal?.aborted && !isTimeout) {
        throw err;
      }

      if (isTimeout) {
        lastError = new Error(
          `Request timeout (${timeoutMs / 1000}s) saat menghubungi ${endpoint}`
        );
      } else {
        lastError = err instanceof Error ? err : new Error(String(err));
      }

      // Check if this error is a non-retryable response (e.g. 4xx status error thrown above)
      const isNetworkOrTimeout =
        isTimeout ||
        err?.name === "TypeError" ||
        err?.name === "AbortError";

      if (!isNetworkOrTimeout) {
        // If it's a known non-retryable error, immediately throw
        throw lastError;
      }

      // If attempts remaining, wait with backoff and retry
      if (attempt < maxAttempts) {
        console.warn(
          `[API] Request ke ${endpoint} mengalami kendala: ${lastError.message}. Mencoba lagi (${attempt}/${maxAttempts})...`
        );
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        await sleep(backoffDelay);
      }
    } finally {
      if (timer) clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener("abort", handleExternalAbort);
      }
    }
  }

  if (lastError?.name === "TypeError" || lastError?.message?.includes("fetch")) {
    throw new Error(
      `Gagal terhubung ke server setelah ${maxAttempts} kali percobaan. Pastikan koneksi dan backend aktif.`
    );
  }

  throw (
    lastError ||
    new Error(`Gagal menyelesaikan request setelah ${maxAttempts} kali percobaan.`)
  );
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

  return request<ApiResponse<KasExpense>>("/kas/expenses", {
    method: "POST",
    body: formData,
  });
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

  return request<ApiResponse<KasExpense>>(`/kas/expenses/${id}`, {
    method: "POST",
    body: formData,
  });
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
