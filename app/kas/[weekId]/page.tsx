"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Users,
  Loader2,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { getWeekStudents, togglePayment } from "@/lib/api";
import { formatRupiah, formatDate } from "@/lib/format";
import type { KasWeek, WeekStudent, WeekStudentsStats } from "@/types/types";
import { cn } from "@/lib/utils";

export default function ChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const weekId = Number(params.weekId);

  const [week, setWeek] = useState<KasWeek | null>(null);
  const [students, setStudents] = useState<WeekStudent[]>([]);
  const [stats, setStats] = useState<WeekStudentsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());

  const fetchData = useCallback(
    async (searchQuery?: string) => {
      try {
        const res = await getWeekStudents(weekId, searchQuery);
        setWeek(res.week);
        setStudents(res.data);
        setStats(res.stats);
      } catch {
        toast.error("Gagal memuat data siswa");
      }
    },
    [weekId]
  );

  useEffect(() => {
    let ignore = false;
    const timeout = setTimeout(() => {
      getWeekStudents(weekId, search || undefined)
        .then((res) => {
          if (!ignore) {
            setWeek(res.week);
            setStudents(res.data);
            setStats(res.stats);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!ignore) {
            toast.error("Gagal memuat data siswa");
            setLoading(false);
          }
        });
    }, search ? 300 : 0);

    return () => {
      ignore = true;
      clearTimeout(timeout);
    };
  }, [weekId, search]);

  const handlePayment = async (student: WeekStudent, method: "cash" | "qris") => {
    const id = student.id;
    const key = `${id}-${method}`;
    setTogglingKeys((prev) => new Set(prev).add(key));

    const prevStudent = { ...student };
    const nowIso = new Date().toISOString();

    // Optimistic update students
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              is_paid: true,
              status: "paid" as const,
              payment_method: method,
              paid_at: nowIso,
            }
          : s
      )
    );

    // Update stats optimistically
    setStats((prev) => {
      if (!prev) return prev;
      const newPaid = prev.paid_count + 1;
      const newUnpaid = prev.unpaid_count - 1;
      const newCollected = newPaid * (week?.amount ?? 0);
      return {
        ...prev,
        paid_count: newPaid,
        unpaid_count: newUnpaid,
        total_collected: newCollected,
        collection_percentage:
          prev.target_amount > 0
            ? Math.round((newCollected / prev.target_amount) * 100 * 10) / 10
            : 0,
      };
    });

    try {
      const res = await togglePayment({
        student_id: id,
        kas_week_id: weekId,
        payment_method: method,
        status: "paid",
      });

      if (res.data) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  is_paid: res.data.is_paid,
                  status: res.data.status,
                  payment_method: res.data.payment_method,
                  paid_at: res.data.paid_at || nowIso,
                }
              : s
          )
        );
      }

      const name = student.nickname || student.name.split(" ")[0];
      toast.success(
        `${name} lunas (${method === "cash" ? "Cash" : "QRIS"})`
      );
    } catch {
      // Revert on error
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? prevStudent : s))
      );
      toast.error("Gagal mengubah status pembayaran");
      fetchData(search || undefined);
    } finally {
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleCancel = async (student: WeekStudent) => {
    const id = student.id;
    const key = `${id}-cancel`;
    setTogglingKeys((prev) => new Set(prev).add(key));

    const prevStudent = { ...student };

    // Optimistic update students
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              is_paid: false,
              status: "unpaid" as const,
              paid_at: null,
            }
          : s
      )
    );

    // Update stats optimistically
    setStats((prev) => {
      if (!prev) return prev;
      const newPaid = prev.paid_count - 1;
      const newUnpaid = prev.unpaid_count + 1;
      const newCollected = newPaid * (week?.amount ?? 0);
      return {
        ...prev,
        paid_count: newPaid,
        unpaid_count: newUnpaid,
        total_collected: newCollected,
        collection_percentage:
          prev.target_amount > 0
            ? Math.round((newCollected / prev.target_amount) * 100 * 10) / 10
            : 0,
      };
    });

    try {
      const res = await togglePayment({
        student_id: id,
        kas_week_id: weekId,
        status: "unpaid",
      });

      if (res.data) {
        setStudents((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  is_paid: res.data.is_paid,
                  status: res.data.status,
                  payment_method: res.data.payment_method,
                  paid_at: res.data.paid_at,
                }
              : s
          )
        );
      }

      const name = student.nickname || student.name.split(" ")[0];
      toast(`${name} dibatalkan`);
    } catch {
      // Revert on error
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? prevStudent : s))
      );
      toast.error("Gagal membatalkan pembayaran");
      fetchData(search || undefined);
    } finally {
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const filteredStudents = useMemo(() => {
    if (!onlyUnpaid) return students;
    return students.filter((s) => !s.is_paid);
  }, [students, onlyUnpaid]);

  if (loading) return <ChecklistSkeleton />;

  const percentage = stats ? Math.round(stats.collection_percentage) : 0;

  return (
    <div className="mx-auto max-w-lg pb-24">
      {/* Sticky Header with Obsidian Glass Blur */}
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
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h1 className="text-base font-bold text-white truncate leading-snug">
                    {week?.title ?? "Checklist Kas"}
                  </h1>
                  {week?.type === "incidental" && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] font-bold tracking-wider flex items-center gap-0.5">
                      Khusus
                    </span>
                  )}
                </div>
                {week && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                    <span>Tarif: {formatRupiah(week.amount)} / siswa</span>
                    {week.due_date && (
                      <span className="text-amber-300/80">• Tenggat: {formatDate(week.due_date)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white border border-white/15 text-xs font-semibold tabular-nums">
              {percentage}%
            </span>
          </div>

          {/* Stats Bar & Metrics */}
          {stats && (
            <div className="rounded-xl bg-black/40 border border-white/6 p-3 space-y-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
                    TOTAL TERKUMPUL
                  </span>
                  <span className="text-lg font-bold text-white tabular-nums tracking-tight mt-0.5 block">
                    {formatRupiah(stats.total_collected)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
                    TARGET TOTAL
                  </span>
                  <span className="text-xs font-semibold text-white/80 tabular-nums mt-0.5 block">
                    {formatRupiah(stats.target_amount)}
                  </span>
                </div>
              </div>

              {/* White Progress Bar */}
              <div className="h-1.5 w-full rounded-full bg-black/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>

              {/* Sub-counts */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-muted-foreground">
                <span className="text-success font-medium tabular-nums">
                  ✓ {stats.paid_count} Lunas
                </span>
                <span className="text-warning font-medium tabular-nums">
                  • {stats.unpaid_count} Belum Bayar
                </span>
                <span className="text-muted-foreground tabular-nums">
                  Total: {stats.total_students}
                </span>
              </div>
            </div>
          )}

          {/* Search + Filter Unpaid */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau no. absen…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-8 pe-8 h-9 text-base sm:text-xs rounded-xl bg-black/40 border-white/8-white"
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
              {stats && (
                <span className="px-1.5 py-0.2 rounded-full bg-warning/20 text-[10px] font-bold tabular-nums">
                  {stats.unpaid_count}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="px-4 py-4 space-y-2">
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center surface-card rounded-2xl bg-card border border-border/50 p-6">
            <Users className="h-10 w-10 text-muted-foreground/30 mb-3 stroke-[1.5]" />
            <p className="text-sm font-semibold text-white">
              Tidak ada siswa yang sesuai
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search ? "Coba ganti kata kunci pencarian" : "Semua siswa sudah melunasi iuran minggu ini"}
            </p>
          </div>
        ) : (
          filteredStudents.map((student) => {
            const isCashLoading = togglingKeys.has(`${student.id}-cash`);
            const isQrisLoading = togglingKeys.has(`${student.id}-qris`);
            const isCancelLoading = togglingKeys.has(`${student.id}-cancel`);
            const isAnyLoading = isCashLoading || isQrisLoading || isCancelLoading;

            return (
              <div
                key={student.id}
                className={cn(
                  "surface-card rounded-2xl bg-card border p-3 flex items-center justify-between gap-3 transition-all",
                  student.is_paid
                    ? "border-emerald-500/25 bg-emerald-500/2"
                    : "border-border/40 hover:border-border/80",
                  isAnyLoading && "opacity-75"
                )}
              >
                {/* Left: Attendance badge + Name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-xl bg-black/40 border border-white/8 flex items-center justify-center text-xs font-bold text-white tabular-nums shrink-0">
                    {student.attendance_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate leading-snug">
                      {student.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      {student.nickname && <span>{student.nickname}</span>}
                      {student.is_paid && (
                        <>
                          {student.nickname && <span>•</span>}
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            {student.payment_method === "qris" ? "QRIS" : "Cash"}
                          </span>
                          {student.paid_at && (
                            <span className="text-[11px] text-white/70 tabular-nums">
                              • {formatDate(student.paid_at)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                {student.is_paid ? (
                  <button
                    onClick={() => handleCancel(student)}
                    disabled={isCancelLoading}
                    title="Batalkan pembayaran"
                    className="h-8 px-3 rounded-xl text-xs font-semibold press-scale transition-all shrink-0 flex items-center gap-1.5 border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 hover:border-rose-500/40 select-none shadow-xs"
                  >
                    {isCancelLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <X className="h-3.5 w-3.5 stroke-[2.5]" />
                        <span>Batal</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Cash Button */}
                    <button
                      onClick={() => handlePayment(student, "cash")}
                      disabled={isAnyLoading}
                      title="Bayar Tunai (Cash)"
                      className="h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold press-scale transition-all flex items-center gap-1.5 border border-white/15 bg-white/10 text-white hover:bg-white/20 hover:border-white/30 select-none shadow-xs"
                    >
                      {isCashLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>Cash</span>
                        </>
                      )}
                    </button>

                    {/* QRIS Button */}
                    <button
                      onClick={() => handlePayment(student, "qris")}
                      disabled={isAnyLoading}
                      title="Bayar via QRIS"
                      className="h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold press-scale transition-all flex items-center gap-1.5 border border-white/15 bg-white/10 text-white hover:bg-white/20 hover:border-white/30 select-none shadow-xs"
                    >
                      {isQrisLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <span>QRIS</span>
                        </>
                      )}
                    </button>
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

function ChecklistSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-7 w-12 rounded-lg" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
