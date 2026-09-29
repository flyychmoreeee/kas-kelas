"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  CalendarCheck,
  Users,
  Trash2,
  Pencil,
  ArrowRight,
  CalendarRange,
  Calendar,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { getWeeks, createWeek, updateWeek, deleteWeek } from "@/lib/api";
import { formatRupiah, formatDate, MONTH_NAMES } from "@/lib/format";
import { WeekModal, type WeekModalPayload } from "@/components/kas/week-modal";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { PeriodPicker } from "@/components/period-picker";
import type { KasWeek } from "@/types/types";
import { cn } from "@/lib/utils";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function WeeksPage() {
  const [weeks, setWeeks] = useState<KasWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [filterType, setFilterType] = useState<"all" | "routine" | "incidental">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState<KasWeek | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refreshWeeks = useCallback(async () => {
    try {
      const res = await getWeeks({
        year: filterYear || undefined,
        month: filterMonth || undefined,
        type: filterType !== "all" ? filterType : undefined,
      });
      setWeeks(res.data);
    } catch {
      toast.error("Gagal memuat data minggu");
    }
  }, [filterYear, filterMonth, filterType]);

  useEffect(() => {
    let ignore = false;

    getWeeks({
      year: filterYear || undefined,
      month: filterMonth || undefined,
      type: filterType !== "all" ? filterType : undefined,
    })
      .then((res) => {
        if (!ignore) {
          setWeeks(res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          toast.error("Gagal memuat data minggu");
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [filterYear, filterMonth, filterType]);

  const handleSave = async (payload: WeekModalPayload) => {
    try {
      if (editingWeek) {
        await updateWeek(editingWeek.id, payload as Partial<KasWeek>);
        toast.success(
          payload.type === "incidental"
            ? "Iuran khusus berhasil diperbarui"
            : "Minggu kas berhasil diperbarui"
        );
      } else {
        await createWeek(payload as Omit<KasWeek, "id" | "created_at" | "updated_at">);
        toast.success(
          payload.type === "incidental"
            ? "Iuran khusus baru berhasil ditambahkan"
            : "Minggu baru berhasil ditambahkan"
        );
      }
      setEditingWeek(null);
      refreshWeeks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await deleteWeek(id);
      toast.success("Data berhasil dihapus");
      setDeleteConfirm(null);
      refreshWeeks();
    } catch {
      toast.error("Gagal menghapus data");
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (week: KasWeek) => {
    setEditingWeek(week);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingWeek(null);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Kelola Kas & Iuran
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daftar kas mingguan rutin dan iuran kegiatan khusus
          </p>
        </div>

        <button
          onClick={openCreate}
          className="hidden sm:inline-flex h-9 px-3.5 rounded-xl bg-white text-black text-xs font-semibold press-scale hover:bg-neutral-200 transition-all items-center gap-1.5 shadow-sm"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.2]" />
          <span>Tambah Iuran</span>
        </button>
      </div>

      {/* Type Pill Filter */}
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
          Semua
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

      {/* Calendar Period Filter */}
      <PeriodPicker
        month={filterMonth}
        year={filterYear}
        disabled={filterType === "incidental"}
        disabledText="Semua Iuran Khusus (Seluruh Periode)"
        onChange={(m, y) => {
          setFilterMonth(m);
          setFilterYear(y);
        }}
      />

      {/* Quick Access: Bulk Monthly View */}
      {!loading && weeks.length > 0 && filterType !== "incidental" && (
        <Link href="/kas/bulan" className="block">
          <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors press-scale group">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                <CalendarRange className="h-4 w-4 text-white/70" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  Pencatatan Bulanan
                </p>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Catat semua minggu sekaligus dalam 1 halaman
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
          </div>
        </Link>
      )}

      {/* Week & Dues List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : weeks.length === 0 ? (
        <div className="surface-card rounded-2xl bg-card border border-border/50 p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center mx-auto text-muted-foreground">
            <CalendarCheck className="h-6 w-6 stroke-[1.5]" />
          </div>
          <p className="text-sm font-semibold text-white">Belum ada data iuran</p>
          <p className="text-xs text-muted-foreground max-w-60 mx-auto leading-relaxed">
            Tambahkan kas mingguan atau iuran khusus (lomba/kegiatan) untuk mulai mencatat.
          </p>
          <button
            onClick={openCreate}
            className="h-9 px-4 rounded-xl bg-white text-black text-xs font-semibold press-scale hover:bg-neutral-200 transition-all inline-flex items-center gap-1.5 shadow-sm mt-1"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.2]" />
            <span>Buat iuran sekarang</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {weeks.map((week) => {
            const isIncidental = week.type === "incidental";
            return (
              <div
                key={week.id}
                className={cn(
                  "surface-card rounded-2xl bg-card border p-5 space-y-3.5 transition-all hover:border-border",
                  isIncidental
                    ? "border-amber-500/20 bg-linear-to-b from-card to-amber-950/4"
                    : "border-border/50",
                  week.is_active && "ring-1 ring-white/20"
                )}
              >
                {/* Card Top Row */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1 pe-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isIncidental ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold tracking-wider flex items-center gap-1">
                          IURAN KHUSUS
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                          MINGGU {week.week ?? 1}
                        </span>
                      )}
                    </div>

                    <h2 className="text-base font-bold text-white tracking-tight leading-snug">
                      {week.title}
                    </h2>

                    {week.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {week.description}
                      </p>
                    )}
                  </div>

                  {/* Edit / Delete Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(week)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors press-scale"
                      title="Edit iuran"
                    >
                      <Pencil className="h-3.5 w-3.5 stroke-[1.8]" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(week.id)}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors press-scale"
                      title="Hapus iuran"
                    >
                      <Trash2 className="h-3.5 w-3.5 stroke-[1.8]" />
                    </button>
                  </div>
                </div>

                {/* Recessed Stat Box */}
                <div className="rounded-xl bg-black/40 border border-white/10 p-3.5 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
                        TOTAL TERKUMPUL
                      </span>
                      <span className="text-xl font-bold text-white tabular-nums tracking-tight mt-0.5 block">
                        {formatRupiah(week.total_collected ?? 0)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block">
                        TARIF / SISWA
                      </span>
                      <span className="text-xs font-semibold text-white/90 tabular-nums mt-0.5 block">
                        {formatRupiah(week.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1 text-white/80 tabular-nums">
                      <Users className="h-3 w-3 stroke-[1.8] text-muted-foreground" />
                      <span>{week.paid_count ?? 0} siswa sudah lunas</span>
                    </span>

                    {week.due_date ? (
                      <span className="text-[11px] text-amber-300/80 font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Tenggat: {formatDate(week.due_date)}</span>
                      </span>
                    ) : week.month && week.year ? (
                      <span className="text-[11px] text-muted-foreground">
                        {MONTH_NAMES[week.month]} {week.year}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        {isIncidental ? "Insidental" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <Link href={`/kas/${week.id}`} className="block">
                  <button className="w-full h-10 rounded-xl bg-white text-black font-semibold text-xs press-scale hover:bg-neutral-200 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                    <span>Buka checklist pembayaran</span>
                    <ArrowRight className="h-3.5 w-3.5 stroke-[2.2]" />
                  </button>
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Add Button for Mobile */}
      <button
        onClick={openCreate}
        className="fixed bottom-20 right-4 sm:hidden h-13 w-13 rounded-full bg-white text-black shadow-xl shadow-black/50 z-40 press-scale flex items-center justify-center cursor-pointer"
        aria-label="Tambah kas atau iuran"
      >
        <Plus className="h-6 w-6 stroke-[2.4]" />
      </button>

      {/* Responsive Modal Form */}
      <WeekModal
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingWeek(null);
        }}
        week={editingWeek}
        onSave={handleSave}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={deleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title="Hapus iuran ini?"
        description="Data periode/iuran ini beserta seluruh riwayat pembayarannya akan dihapus secara permanen."
        confirmLabel="Hapus sekarang"
        loading={deleting}
        onConfirm={() => {
          if (deleteConfirm) handleDelete(deleteConfirm);
        }}
      />
    </div>
  );
}
