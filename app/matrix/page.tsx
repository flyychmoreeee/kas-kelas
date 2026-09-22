"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  TableProperties,
  CheckCircle2,
  AlertCircle,
  Search,
  X,
  Circle,
  Sparkles,
  CalendarRange,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/toast";
import { getMatrix } from "@/lib/api";
import { formatRupiah, MONTH_NAMES } from "@/lib/format";
import { PeriodPicker } from "@/components/period-picker";
import type { KasWeek, MatrixStudent } from "@/types/types";
import { cn } from "@/lib/utils";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function MatrixPage() {
  const [weeks, setWeeks] = useState<KasWeek[]>([]);
  const [students, setStudents] = useState<MatrixStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [filterType, setFilterType] = useState<"all" | "routine" | "incidental">("all");
  const [search, setSearch] = useState("");
  const [onlyArrears, setOnlyArrears] = useState(false);

  // Fetch matrix with smart query parameters so incidental dues (which have month=null) are never excluded
  useEffect(() => {
    let ignore = false;

    let params: {
      year?: number;
      month?: number;
      limit_weeks?: number;
      type?: string;
    } = { limit_weeks: 50 };

    if (filterType === "incidental") {
      // For incidental dues, do not filter by month or year in backend query because incidental dues have month=null!
      params = {
        type: "incidental",
        limit_weeks: 50,
      };
    } else if (filterType === "routine") {
      params = {
        type: "routine",
        year: filterYear || undefined,
        month: filterMonth || undefined,
        limit_weeks: 50,
      };
    } else {
      // For "all", do NOT restrict month in backend SQL query so incidental fees (with month=null) are included!
      // Routine weeks will then be filtered client-side by filterMonth if set.
      params = {
        year: filterYear || undefined,
        limit_weeks: 50,
      };
    }

    getMatrix(params)
      .then((res) => {
        if (!ignore) {
          setWeeks(res.weeks);
          setStudents(res.students);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          toast.error("Gagal memuat data matrix");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [filterYear, filterMonth, filterType]);

  // Filter columns based on routine vs incidental selection
  const displayedWeeks = useMemo(() => {
    return weeks.filter((w) => {
      const isIncidental =
        w.type === "incidental" || (!w.week && w.type !== "routine");

      if (filterType === "routine") {
        if (isIncidental) return false;
        if (filterMonth && w.month && w.month !== filterMonth) return false;
        return true;
      }

      if (filterType === "incidental") {
        return isIncidental;
      }

      // filterType === "all":
      // Incidental dues are ALWAYS displayed
      if (isIncidental) return true;
      // Routine weeks are filtered by selected month if not "Semua Bulan"
      if (filterMonth && w.month && w.month !== filterMonth) return false;
      return true;
    });
  }, [weeks, filterType, filterMonth]);

  // Derived filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.nickname && s.nickname.toLowerCase().includes(search.toLowerCase())) ||
        String(s.attendance_number).includes(search);

      const matchesArrears = !onlyArrears || s.total_arrears > 0;

      return matchesSearch && matchesArrears;
    });
  }, [students, search, onlyArrears]);

  // Summary statistics
  const totalArrears = useMemo(
    () => students.reduce((sum, s) => sum + s.total_arrears, 0),
    [students]
  );
  const fullyPaidCount = useMemo(
    () => students.filter((s) => s.total_arrears === 0).length,
    [students]
  );
  const arrearsCount = students.length - fullyPaidCount;

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Matrix Pembayaran
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Rekap status kas rutin mingguan & iuran khusus seluruh siswa
        </p>
      </div>

      {/* Summary Cards */}
      {!loading && students.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="surface-card rounded-2xl bg-card border border-border/50 p-4 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
              LUNAS SEMUA
            </span>
            <p className="text-2xl font-bold text-white tabular-nums tracking-tight">
              {fullyPaidCount} <span className="text-xs font-normal text-muted-foreground">/ {students.length}</span>
            </p>
            <span className="text-[11px] text-success font-medium inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 stroke-[2.5]" /> Tertib Iuran
            </span>
          </div>

          <div className="surface-card rounded-2xl bg-card border border-border/50 p-4 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
              TOTAL TUNGGAKAN
            </span>
            <p className="text-2xl font-bold text-warning tabular-nums tracking-tight">
              {formatRupiah(totalArrears)}
            </p>
            <span className="text-[11px] text-muted-foreground font-medium inline-flex items-center gap-1 tabular-nums">
              <AlertCircle className="h-3 w-3 stroke-[2] text-warning" /> {arrearsCount} siswa belum lunas
            </span>
          </div>
        </div>
      )}

      {/* Type Toggle Pills */}
      <div className="grid grid-cols-3 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-semibold">
        <button
          onClick={() => setFilterType("all")}
          className={cn(
            "py-1.5 px-2 rounded-lg transition-all text-center press-scale",
            filterType === "all"
              ? "bg-white text-black shadow-sm font-bold"
              : "text-muted-foreground hover:text-white"
          )}
        >
          Semua Iuran
        </button>
        <button
          onClick={() => setFilterType("routine")}
          className={cn(
            "py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 press-scale",
            filterType === "routine"
              ? "bg-white text-black shadow-sm font-bold"
              : "text-muted-foreground hover:text-white"
          )}
        >
          <span>Kas Rutin</span>
        </button>
        <button
          onClick={() => setFilterType("incidental")}
          className={cn(
            "py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 press-scale",
            filterType === "incidental"
              ? "bg-white text-black shadow-sm font-bold"
              : "text-muted-foreground hover:text-white"
          )}
        >
          <span>Iuran Khusus</span>
        </button>
      </div>

      {/* Interactive Calendar Period Filter & Search */}
      <div className="space-y-2.5">
        <PeriodPicker
          month={filterMonth}
          year={filterYear}
          disabled={filterType === "incidental"}
          disabledText="Semua Iuran Khusus (Seluruh Periode)"
          customIcon={
            filterType === "incidental" ? (
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            ) : undefined
          }
          onChange={(m, y) => {
            setFilterMonth(m);
            setFilterYear(y);
          }}
        />

        {/* Search & Arrears Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama / no. absen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-8 pe-8 h-9 text-base sm:text-xs rounded-xl bg-black/40 border-white/[0.08] text-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white press-scale"
                aria-label="Reset pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-2xl" />
          ))}
        </div>
      ) : weeks.length === 0 || students.length === 0 ? (
        <div className="surface-card rounded-2xl bg-card border border-border/50 p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-black/40 border border-white/[0.06] flex items-center justify-center mx-auto text-muted-foreground">
            <TableProperties className="h-6 w-6 stroke-[1.5]" />
          </div>
          <p className="text-sm font-semibold text-white">Belum Ada Data</p>
          <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
            Pilih bulan atau tahun yang memiliki data kas atau iuran khusus
          </p>
        </div>
      ) : displayedWeeks.length === 0 ? (
        <div className="surface-card rounded-2xl bg-card border border-border/50 p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-white">Tidak Ada Iuran Sesuai Filter</p>
          <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
            {filterType === "incidental"
              ? "Belum ada iuran khusus yang tercatat. Klik 'Semua Iuran' atau tambahkan iuran khusus baru dari menu Kas."
              : "Belum ada kas rutin pada periode ini. Coba pilih bulan lain atau 'Semua Bulan'."}
          </p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground surface-card rounded-2xl bg-card border border-border/50 p-6">
          Tidak ada siswa yang cocok dengan filter
        </div>
      ) : (
        <div className="surface-card rounded-2xl bg-card border border-border/50 overflow-hidden">
          <ScrollArea className="w-full">
            <div className="min-w-max">
              {/* Table Header */}
              <div className="flex border-b border-white/[0.08] bg-black/40 sticky top-0 z-20">
                {/* Student Column Header */}
                <div className="sticky left-0 z-30 bg-card flex items-center px-3.5 py-2.5 min-w-[145px] border-r border-white/[0.08]">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Siswa
                  </span>
                </div>

                {/* Week Columns Headers */}
                {displayedWeeks.map((week) => {
                  const isIncidental =
                    week.type === "incidental" ||
                    (!week.week && week.type !== "routine");

                  if (isIncidental) {
                    return (
                      <div
                        key={week.id}
                        title={`${week.title} (${formatRupiah(week.amount)})`}
                        className="flex flex-col items-center justify-center px-2 py-2 min-w-[76px] max-w-[90px] border-r border-amber-500/20 bg-amber-500/[0.05] last:border-r-0 cursor-help"
                      >
                        <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-extrabold uppercase tracking-tight flex items-center gap-0.5">
                          Khusus
                        </span>
                        <span className="text-[10px] font-bold text-white truncate max-w-[72px] text-center mt-0.5">
                          {week.title}
                        </span>
                        <span className="text-[8px] text-amber-300/80 font-medium tabular-nums">
                          {formatRupiah(week.amount)}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={week.id}
                      title={`${week.title} (${formatRupiah(week.amount)})`}
                      className="flex flex-col items-center justify-center px-2 py-2 min-w-[54px] border-r border-white/[0.06] last:border-r-0"
                    >
                      <span className="text-[11px] font-bold text-white">
                        M{week.week ?? 1}
                      </span>
                      <span className="text-[9px] text-muted-foreground tabular-nums">
                        {week.month ? MONTH_NAMES[week.month]?.slice(0, 3) : "Kas"}
                      </span>
                    </div>
                  );
                })}

                {/* Arrears Column Header */}
                <div className="flex items-center justify-center px-3 py-2.5 min-w-[90px]">
                  <span className="text-[10px] font-bold text-warning uppercase tracking-wider">
                    Tunggakan
                  </span>
                </div>
              </div>

              {/* Table Body */}
              {filteredStudents.map((student, idx) => (
                <div
                  key={student.id}
                  className={cn(
                    "flex border-b border-white/[0.04] last:border-b-0 transition-colors hover:bg-white/[0.02]",
                    idx % 2 === 0 ? "bg-card" : "bg-black/20"
                  )}
                >
                  {/* Student Name (sticky left) */}
                  <div
                    className={cn(
                      "sticky left-0 z-10 flex items-center gap-2 px-3.5 py-2.5 min-w-[145px] border-r border-white/[0.08]",
                      idx % 2 === 0 ? "bg-card" : "bg-card"
                    )}
                  >
                    <span className="text-xs font-bold text-muted-foreground w-5 shrink-0 tabular-nums">
                      {student.attendance_number}
                    </span>
                    <span className="text-xs font-medium text-white truncate max-w-[95px]">
                      {student.nickname || student.name.split(" ")[0]}
                    </span>
                  </div>

                  {/* Week Status Cells */}
                  {displayedWeeks.map((week) => {
                    const ws = student.weeks.find((w) => w.week_id === week.id);
                    const isPaid = ws ? ws.is_paid : false;
                    const isIncidental =
                      week.type === "incidental" ||
                      (!week.week && week.type !== "routine");

                    return (
                      <div
                        key={week.id}
                        title={`${student.name} • ${week.title}: ${
                          isPaid ? "Lunas" : "Belum Bayar"
                        }`}
                        className={cn(
                          "flex items-center justify-center px-2 py-2 border-r last:border-r-0",
                          isIncidental
                            ? "min-w-[76px] max-w-[90px] border-amber-500/10 bg-amber-500/[0.02]"
                            : "min-w-[54px] border-white/[0.04]"
                        )}
                      >
                        {isPaid ? (
                          <CheckCircle2 className="h-4 w-4 text-success stroke-[2.2]" />
                        ) : (
                          <Circle
                            className={cn(
                              "h-4 w-4 stroke-[1.5]",
                              isIncidental ? "text-amber-500/25" : "text-white/15"
                            )}
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Arrears Status */}
                  <div className="flex items-center justify-center px-3 py-2 min-w-[90px]">
                    {student.total_arrears > 0 ? (
                      <span className="text-[11px] font-bold text-warning tabular-nums">
                        {formatRupiah(student.total_arrears)}
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-success/30 text-success bg-success/10 font-semibold">
                        Lunas
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Legend & Stats */}
      {!loading && students.length > 0 && (
        <div className="space-y-2 px-1 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 text-white/80">
                <CheckCircle2 className="h-3.5 w-3.5 text-success stroke-[2]" />
                <span>Lunas</span>
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Circle className="h-3.5 w-3.5 text-white/20 stroke-[1.5]" />
                <span>Belum</span>
              </span>
            </div>

            <span className="text-[11px] text-muted-foreground tabular-nums">
              {filteredStudents.length} dari {students.length} siswa
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
