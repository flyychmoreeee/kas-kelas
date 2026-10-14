// === Kas Week ===
export interface KasWeek {
  id: number;
  title: string;
  type?: "routine" | "incidental";
  description?: string | null;
  week?: number | null;
  month?: number | null;
  year?: number | null;
  amount: number;
  start_date?: string | null;
  end_date?: string | null;
  due_date?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Aggregates from withCount/withSum
  paid_count?: number;
  total_collected?: number;
}

// === Student ===
export interface Student {
  id: number;
  attendance_number: number;
  name: string;
  nickname: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// === Kas Payment (toggle response) ===
export interface KasPaymentToggle {
  student_id: number;
  kas_week_id: number;
  status: "paid" | "unpaid";
  is_paid: boolean;
  paid_at: string | null;
  amount_paid: number;
  payment_method: "cash" | "qris";
  notes?: string | null;
}

// === Week Students (checklist item) ===
export interface WeekStudent {
  id: number;
  attendance_number: number;
  name: string;
  nickname: string | null;
  is_paid: boolean;
  status: "paid" | "unpaid";
  amount_paid: number;
  paid_at: string | null;
  payment_method?: "cash" | "qris" | null;
  notes: string | null;
}

export interface WeekStudentsStats {
  total_students: number;
  paid_count: number;
  unpaid_count: number;
  total_collected: number;
  target_amount: number;
  collection_percentage: number;
}

export interface WeekStudentsResponse {
  success: boolean;
  week: KasWeek;
  stats: WeekStudentsStats;
  data: WeekStudent[];
}

// === Overview ===
export interface ActiveWeekStats {
  id: number;
  title: string;
  amount: number;
  total_students: number;
  paid_count: number;
  unpaid_count: number;
  cash_count: number;
  qris_count: number;
  collected: number;
  collected_cash: number;
  collected_qris: number;
}

export interface KasExpense {
  id: number;
  title: string;
  amount: number;
  expense_date: string;
  receipt_image: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OverviewData {
  balance: number;
  total_income: number;
  total_cash_income: number;
  total_qris_income: number;
  total_expense: number;
  active_week: ActiveWeekStats | null;
  recent_expenses: KasExpense[];
}

// === Matrix ===
export interface MatrixWeekStatus {
  week_id: number;
  week_title: string;
  is_paid: boolean;
}

export interface MatrixStudent {
  id: number;
  attendance_number: number;
  name: string;
  nickname: string | null;
  weeks: MatrixWeekStatus[];
  unpaid_weeks_count: number;
  total_arrears: number;
}

export interface MatrixResponse {
  success: boolean;
  weeks: KasWeek[];
  students: MatrixStudent[];
}

// === Pagination ===
export interface Pagination {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// === Generic API Response ===
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}
