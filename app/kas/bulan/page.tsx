"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Users,
  Loader2,
  X,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { getWeeks, getWeekStudents, togglePayment } from "@/lib/api";
import { formatRupiah, formatDate, MONTH_NAMES } from "@/lib/format";
import { PeriodPicker } from "@/components/period-picker";
import type { KasWeek, WeekStudent } from "@/types/types";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface WeekPaymentStatus {
  week_id: number;
  week_title: string;
  week_number: number | null;
  amount: number;
  is_paid: boolean;
  status: "paid" | "unpaid";
  payment_method?: "cash" | "qris" | null;
  paid_at: string | null;
}

interface BulkStudent {
  id: number;
  attendance_number: number;
  name: string;
  nickname: string | null;
  weeks: WeekPaymentStatus[];
  paid_count: number;
  total_weeks: number;
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function mergeStudentData(
  weeks: KasWeek[],
  weekStudentsMap: Map<number, WeekStudent[]>
): BulkStudent[] {
  const studentMap = new Map<number, BulkStudent>();

  for (const week of weeks) {
    const students = weekStudentsMap.get(week.id) || [];
    for (const student of students) {
      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, {
          id: student.id,
          attendance_number: student.attendance_number,
          name: student.name,
          nickname: student.nickname,
          weeks: [],
          paid_count: 0,
          total_weeks: 0,
        });
      }
      const entry = studentMap.get(student.id)!;
      entry.weeks.push({
        week_id: week.id,
        week_title: week.title,
        week_number: week.week ?? null,
        amount: week.amount,
        is_paid: student.is_paid,
        status: student.status,
        payment_method: student.payment_method,
        paid_at: student.paid_at,
      });
      entry.total_weeks++;
      if (student.is_paid) entry.paid_count++;
    }
  }

  return Array.from(studentMap.values()).sort(
    (a, b) => a.attendance_number - b.attendance_number
  );
}

// ──────────────────────────────────────
// Page Component
// ──────────────────────────────────────

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;

export default function BulkChecklistPage() {
  const router = useRouter();

  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [weeks, setWeeks] = useState<KasWeek[]>([]);
  const [students, setStudents] = useState<BulkStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const weeksRes = await getWeeks({ year, month });
        if (ignore) return;
        const monthWeeks = weeksRes.data;
        setWeeks(monthWeeks);

        if (monthWeeks.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }

        const results = await Promise.all(
          monthWeeks.map((w) => getWeekStudents(w.id))
        );
        if (ignore) return;

        const weekStudentsMap = new Map<number, WeekStudent[]>();
        results.forEach((res, idx) => {
          weekStudentsMap.set(monthWeeks[idx].id, res.data);
        });

        setStudents(mergeStudentData(monthWeeks, weekStudentsMap));
      } catch {
        if (!ignore) toast.error("Gagal memuat data bulan ini");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [year, month]);

  // ── Toggle expand/collapse ──
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Handle single payment ──
  const handlePayment = async (
    studentId: number,
    weekId: number,
    method: "cash" | "qris"
  ) => {
    const key = `${studentId}-${weekId}-${method}`;
    setTogglingKeys((prev) => new Set(prev).add(key));

    const nowIso = new Date().toISOString();
    const prevStudents = students;

    // Find student/week for toast
    const student = students.find((s) => s.id === studentId);
    const weekInfo = student?.weeks.find((w) => w.week_id === weekId);
    const name = student?.nickname || student?.name.split(" ")[0] || "";

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const newWeeks = s.weeks.map((w) => {
          if (w.week_id !== weekId) return w;
          return {
            ...w,
            is_paid: true,
            status: "paid" as const,
            payment_method: method,
            paid_at: nowIso,
          };
        });
        return {
          ...s,
          weeks: newWeeks,
          paid_count: newWeeks.filter((w) => w.is_paid).length,
        };
      })
    );

    try {
      const res = await togglePayment({
        student_id: studentId,
        kas_week_id: weekId,
        payment_method: method,
        status: "paid",
      });

      // Reconcile with server data
      if (res.data) {
        setStudents((prev) =>
          prev.map((s) => {
            if (s.id !== studentId) return s;
            const newWeeks = s.weeks.map((w) => {
              if (w.week_id !== weekId) return w;
              return {
                ...w,
                is_paid: res.data.is_paid,
                status: res.data.status,
                payment_method: res.data.payment_method,
                paid_at: res.data.paid_at,
              };
            });
            return {
              ...s,
              weeks: newWeeks,
              paid_count: newWeeks.filter((w) => w.is_paid).length,
            };
          })
        );
      }

      toast.success(
        `${name} — ${weekInfo?.week_title ?? "Minggu"} lunas (${method === "cash" ? "Cash" : "QRIS"})`
      );
    } catch {
      setStudents(prevStudents);
      toast.error("Gagal mengubah status pembayaran");
    } finally {
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // ── Handle cancel payment ──
  const handleCancel = async (studentId: number, weekId: number) => {
    const key = `${studentId}-${weekId}-cancel`;
    setTogglingKeys((prev) => new Set(prev).add(key));

    const prevStudents = students;
    const student = students.find((s) => s.id === studentId);
    const name = student?.nickname || student?.name.split(" ")[0] || "";

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== studentId) return s;
        const newWeeks = s.weeks.map((w) => {
          if (w.week_id !== weekId) return w;
          return { ...w, is_paid: false, status: "unpaid" as const, paid_at: null };
        });
        return {
          ...s,
          weeks: newWeeks,
          paid_count: newWeeks.filter((w) => w.is_paid).length,
        };
      })
    );

    try {
      await togglePayment({
        student_id: studentId,
        kas_week_id: weekId,
        status: "unpaid",
      });
      toast(`${name} dibatalkan`);
    } catch {
      setStudents(prevStudents);
      toast.error("Gagal membatalkan pembayaran");
    } finally {
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // ── Handle pay all unpaid weeks for a student ──
  const handlePayAllForStudent = async (
    student: BulkStudent,
    method: "cash" | "qris"
  ) => {
    const unpaidWeeks = student.weeks.filter((w) => !w.is_paid);
    if (unpaidWeeks.length === 0) return;

    const keys = unpaidWeeks.map(
      (w) => `${student.id}-${w.week_id}-${method}`
    );
    setTogglingKeys((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      return next;
    });

    const nowIso = new Date().toISOString();
    const prevStudents = students;
    const name = student.nickname || student.name.split(" ")[0];

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== student.id) return s;
        const newWeeks = s.weeks.map((w) => {
          if (w.is_paid) return w;
          return {
            ...w,
            is_paid: true,
            status: "paid" as const,
            payment_method: method,
            paid_at: nowIso,
          };
        });
        return {
          ...s,
          weeks: newWeeks,
          paid_count: newWeeks.filter((w) => w.is_paid).length,
        };
      })
    );

    try {
      await Promise.all(
        unpaidWeeks.map((w) =>
          togglePayment({
            student_id: student.id,
            kas_week_id: w.week_id,
            payment_method: method,
            status: "paid",
          })
        )
      );
      toast.success(
        `${name} — ${unpaidWeeks.length} minggu dilunasi (${method === "cash" ? "Cash" : "QRIS"})`
      );
    } catch {
      setStudents(prevStudents);
      toast.error("Gagal melunasi semua minggu");
    } finally {
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        keys.forEach((k) => next.delete(k));
        return next;
      });
    }
  };

  // ── Computed values ──
  const filteredStudents = useMemo(() => {
    let result = students;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.nickname?.toLowerCase().includes(q) ||
          String(s.attendance_number).includes(q)
      );
    }

    if (onlyUnpaid) {
      result = result.filter((s) => s.paid_count < s.total_weeks);
    }

    return result;
  }, [students, search, onlyUnpaid]);

  const totalPayments = useMemo(() => {
    let total = 0,
      paid = 0,
      collected = 0,
      target = 0;
    for (const s of students) {
      for (const w of s.weeks) {
        total++;
        if (w.is_paid) {
          paid++;
          collected += w.amount;
        }
        target += w.amount;
      }
    }
    return { total, paid, unpaid: total - paid, collected, target };
  }, [students]);

  const percentage =
    totalPayments.total > 0
      ? Math.round((totalPayments.paid / totalPayments.total) * 100)
      : 0;

  const unpaidStudentCount = useMemo(
    () => students.filter((s) => s.paid_count < s.total_weeks).length,
    [students]
  );

  if (loading) return <BulkChecklistSkeleton />;

  return (
    <div className="mx-auto max-w-lg pb-24">
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-white/6">
        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* Back + Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/kas")}
                className="h-9 w-9 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/50 flex items-center justify-center press-scale"
                aria-label="Kembali"
              >
                <ArrowLeft className="h-4 w-4 stroke-[2.2]" />
              </button>
              <div>
                <h1 className="text-base font-bold text-white leading-snug">
                  Pencatatan Bulanan
                </h1>
                <p className="text-xs text-muted-foreground">
                  {MONTH_NAMES[month]} {year} • {weeks.length} periode
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white border border-white/15 text-xs font-semibold tabular-nums">
              {percentage}%
            </span>
          </div>

          {/* Period Picker */}
          <PeriodPicker
            month={month}
            year={year}
            onChange={(m, y) => {
              setMonth(m);
              setYear(y);
            }}
          />

          {/* Monthly Stats */}
          {weeks.length > 0 && (
            <div className="rounded-xl bg-black/40 border border-white/6 p-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
                    TERKUMPUL BULAN INI
                  </span>
                  <span className="text-lg font-bold text-white tabular-nums tracking-tight mt-0.5 block">
                    {formatRupiah(totalPayments.collected)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
                    TARGET BULAN
                  </span>
                  <span className="text-xs font-semibold text-white/80 tabular-nums mt-0.5 block">
                    {formatRupiah(totalPayments.target)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full rounded-full bg-black/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>

              {/* Sub-counts */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground">
                <span className="text-success font-medium tabular-nums">
                  ✓ {totalPayments.paid} Lunas
                </span>
                <span className="text-warning font-medium tabular-nums">
                  • {totalPayments.unpaid} Belum
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {students.length} siswa × {weeks.length} minggu
                </span>
              </div>
            </div>
          )}

          {/* Search + Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau no. absen…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-8 pe-8 h-9 text-base sm:text-xs rounded-xl bg-black/40 border-white/8"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white press-scale"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setOnlyUnpaid((prev) => !prev)}
              className={cn(
                "h-9 px-3 rounded-xl text-xs font-medium press-scale transition-colors shrink-0 border flex items-center gap-1.5",
                onlyUnpaid
                  ? "bg-warning/15 text-warning border-warning/30 font-semibold"
                  : "bg-black/40 border-white/8 text-muted-foreground hover:text-white"
              )}
            >
              <span>Belum</span>
              <span className="px-1.5 py-0.5 rounded-full bg-warning/20 text-[10px] font-bold tabular-nums">
                {unpaidStudentCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Student List ── */}
      <div className="px-4 py-4 space-y-2">
        {weeks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center surface-card rounded-2xl bg-card border border-border/50 p-6">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3 stroke-[1.5]" />
            <p className="text-sm font-semibold text-white">
              Belum ada data kas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tidak ada kas yang ditemukan untuk {MONTH_NAMES[month]} {year}
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center surface-card rounded-2xl bg-card border border-border/50 p-6">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3 stroke-[1.5]" />
            <p className="text-sm font-semibold text-white">
              {search
                ? "Tidak ada siswa yang sesuai"
                : "Semua siswa sudah lunas!"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search
                ? "Coba ganti kata kunci"
                : "Seluruh pembayaran bulan ini sudah tercatat"}
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            // Auto-expand when filtering unpaid, otherwise use manual toggle
            const isExpanded = onlyUnpaid
              ? true
              : expandedIds.has(student.id);
            const isFullyPaid =
              student.paid_count === student.total_weeks;
            const unpaidCount =
              student.total_weeks - student.paid_count;
            const progressPercent =
              student.total_weeks > 0
                ? Math.round(
                    (student.paid_count / student.total_weeks) * 100
                  )
                : 0;

            return (
              <div
                key={student.id}
                className={cn(
                  "surface-card rounded-2xl bg-card border transition-all overflow-hidden",
                  isFullyPaid
                    ? "border-emerald-500/25 bg-emerald-500/2"
                    : "border-border/40"
                )}
              >
                {/* ── Student Header (always visible, tap to expand) ── */}
                <button
                  onClick={() => toggleExpand(student.id)}
                  className="w-full p-3 flex items-center gap-3 text-left"
                >
                  <div className="h-8 w-8 rounded-xl bg-black/40 border border-white/8 flex items-center justify-center text-xs font-bold text-white tabular-nums shrink-0">
                    {student.attendance_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate leading-snug">
                      {student.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {/* Mini progress bar */}
                      <div className="h-1 w-12 rounded-full bg-black/60 overflow-hidden shrink-0">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-300",
                            isFullyPaid
                              ? "bg-emerald-400"
                              : "bg-white/60"
                          )}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span
                        className={cn(
                          "text-[11px] font-semibold tabular-nums",
                          isFullyPaid
                            ? "text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {student.paid_count}/{student.total_weeks}
                      </span>
                      {student.nickname && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {student.nickname}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                {/* ── Expanded: Per-Week Controls ── */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {/* Quick pay all if there are unpaid weeks */}
                    {unpaidCount > 0 && (
                      <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/5 border border-white/8 mb-2">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {unpaidCount} belum lunas
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePayAllForStudent(student, "cash");
                            }}
                            disabled={togglingKeys.size > 0}
                            className="h-7 px-2.5 rounded-lg text-[10px] font-bold bg-white/10 text-white border border-white/15 hover:bg-white/20 press-scale transition-all"
                          >
                            Semua Cash
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePayAllForStudent(student, "qris");
                            }}
                            disabled={togglingKeys.size > 0}
                            className="h-7 px-2.5 rounded-lg text-[10px] font-bold bg-white/10 text-white border border-white/15 hover:bg-white/20 press-scale transition-all"
                          >
                            Semua QRIS
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Per-week rows */}
                    {student.weeks.map((week) => {
                      const isCashLoading = togglingKeys.has(
                        `${student.id}-${week.week_id}-cash`
                      );
                      const isQrisLoading = togglingKeys.has(
                        `${student.id}-${week.week_id}-qris`
                      );
                      const isCancelLoading = togglingKeys.has(
                        `${student.id}-${week.week_id}-cancel`
                      );
                      const isWeekLoading =
                        isCashLoading || isQrisLoading || isCancelLoading;

                      return (
                        <div
                          key={week.week_id}
                          className={cn(
                            "rounded-xl p-2.5 flex items-center justify-between gap-2 transition-all",
                            week.is_paid
                              ? "bg-emerald-500/5 border border-emerald-500/15"
                              : "bg-black/20 border border-white/6",
                            isWeekLoading && "opacity-60"
                          )}
                        >
                          {/* Week info */}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-white truncate">
                              {week.week_title}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                              <span className="tabular-nums">
                                {formatRupiah(week.amount)}
                              </span>
                              {week.is_paid && (
                                <>
                                  <span className="text-emerald-400 font-bold uppercase">
                                    •{" "}
                                    {week.payment_method === "qris"
                                      ? "QRIS"
                                      : "Cash"}
                                  </span>
                                  {week.paid_at && (
                                    <span className="text-white/50">
                                      • {formatDate(week.paid_at)}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Week actions */}
                          {week.is_paid ? (
                            <button
                              onClick={() =>
                                handleCancel(student.id, week.week_id)
                              }
                              disabled={isCancelLoading}
                              className="h-7 px-2 rounded-lg text-[10px] font-semibold press-scale transition-all flex items-center gap-1 border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 select-none shrink-0"
                            >
                              {isCancelLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <X className="h-3 w-3 stroke-[2.5]" />
                                  <span>Batal</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() =>
                                  handlePayment(
                                    student.id,
                                    week.week_id,
                                    "cash"
                                  )
                                }
                                disabled={isWeekLoading}
                                className="h-7 px-2.5 rounded-lg text-[10px] font-semibold press-scale transition-all flex items-center gap-1 border border-white/15 bg-white/10 text-white hover:bg-white/20 select-none"
                              >
                                {isCashLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Cash"
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  handlePayment(
                                    student.id,
                                    week.week_id,
                                    "qris"
                                  )
                                }
                                disabled={isWeekLoading}
                                className="h-7 px-2.5 rounded-lg text-[10px] font-semibold press-scale transition-all flex items-center gap-1 border border-white/15 bg-white/10 text-white hover:bg-white/20 select-none"
                              >
                                {isQrisLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "QRIS"
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────
// Skeleton
// ──────────────────────────────────────

function BulkChecklistSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-6 w-40 rounded-lg" />
        <Skeleton className="h-7 w-12 rounded-lg" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
