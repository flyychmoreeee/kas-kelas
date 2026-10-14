"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Receipt,
  Search,
  Trash2,
  Pencil,
  X,
  Calendar,
  Image as ImageIcon,
  ExternalLink,
  FileText,
  ZoomIn,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getStorageUrl,
} from "@/lib/api";
import { formatRupiah, formatDate } from "@/lib/format";
import { ExpenseModal } from "@/components/pengeluaran/expense-modal";
import { ConfirmDeleteModal } from "@/components/confirm-delete-modal";
import { PeriodPicker } from "@/components/period-picker";
import type { KasExpense, Pagination } from "@/types/types";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<KasExpense[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KasExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<KasExpense | null>(null);

  const refreshExpenses = useCallback(async () => {
    try {
      const res = await getExpenses({
        page,
        per_page: 15,
        search: search || undefined,
        year: filterYear || undefined,
        month: filterMonth || undefined,
      });
      setExpenses(res.data);
      setPagination(res.pagination);
    } catch {
      toast.error("Gagal memuat pengeluaran");
    }
  }, [page, search, filterYear, filterMonth]);

  useEffect(() => {
    let ignore = false;
    const timeout = setTimeout(() => {
      getExpenses({
        page,
        per_page: 15,
        search: search || undefined,
        year: filterYear || undefined,
        month: filterMonth || undefined,
      })
        .then((res) => {
          if (!ignore) {
            setExpenses(res.data);
            setPagination(res.pagination);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!ignore) {
            toast.error("Gagal memuat pengeluaran");
            setLoading(false);
          }
        });
    }, search ? 300 : 0);

    return () => {
      ignore = true;
      clearTimeout(timeout);
    };
  }, [page, search, filterYear, filterMonth]);

  const handleSave = async (payload: {
    title: string;
    amount: number;
    expense_date: string;
    receipt_image?: File;
    notes?: string;
  }) => {
    try {
      if (editing) {
        await updateExpense(editing.id, payload);
        toast.success("Pengeluaran berhasil diperbarui");
      } else {
        await createExpense(payload);
        toast.success("Pengeluaran berhasil dicatat");
      }
      setEditing(null);
      refreshExpenses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengeluaran");
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await deleteExpense(id);
      toast.success("Pengeluaran berhasil dihapus");
      setDeleteConfirm(null);
      refreshExpenses();
    } catch {
      toast.error("Gagal menghapus pengeluaran");
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (expense: KasExpense) => {
    setEditing(expense);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Pengeluaran
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Catatan penggunaan uang kas kelas
          </p>
        </div>
      </div>

      {/* Summary Stat Card */}
      {!loading && expenses.length > 0 && (
        <div className="surface-card rounded-2xl bg-card border border-border/50 p-5 space-y-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
            TOTAL PENGELUARAN (HALAMAN INI)
          </span>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
              -{formatRupiah(totalAmount)}
            </p>
            <span className="text-xs text-muted-foreground tabular-nums">
              {expenses.length} transaksi
            </span>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari keperluan pengeluaran..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="ps-8 pe-8 h-10 text-base sm:text-xs rounded-xl bg-black/40 border-white/10 text-white"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white press-scale"
              aria-label="Hapus pencarian"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Calendar Period Filter */}
        <PeriodPicker
          month={filterMonth}
          year={filterYear}
          onChange={(m, y) => {
            setFilterMonth(m);
            setFilterYear(y);
            setPage(1);
          }}
        />
      </div>

      {/* Expense List */}
      {loading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="surface-card rounded-2xl bg-card border border-border/50 p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center mx-auto text-muted-foreground">
            <Receipt className="h-6 w-6 stroke-[1.5]" />
          </div>
          <p className="text-sm font-semibold text-white">Belum ada pengeluaran</p>
          <p className="text-xs text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
            {search
              ? "Tidak ditemukan pengeluaran yang cocok dengan pencarian"
              : "Catat pengeluaran perlengkapan atau kegiatan kelas"}
          </p>
          {!search && (
            <button
              onClick={openCreate}
              className="h-9 px-4 rounded-xl bg-white text-black text-xs font-semibold press-scale hover:bg-neutral-200 transition-all inline-flex items-center gap-1.5 shadow-sm mt-1"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.2]" />
              <span>Catat pengeluaran</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="surface-card rounded-2xl bg-card border border-border/50 p-4 transition-all hover:border-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="shrink-0 rounded-xl bg-black/40 border border-white/10 p-2.5 text-danger mt-0.5">
                    <Receipt className="h-4 w-4 stroke-[2]" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-bold text-white leading-snug">
                      {expense.title}
                    </p>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatDate(expense.expense_date)}
                    </span>
                    {expense.receipt_image && (
                      <button
                        type="button"
                        onClick={() => setViewingReceipt(expense)}
                        className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium press-scale"
                      >
                        <ImageIcon className="h-3 w-3" />
                        <span>Lihat bukti nota</span>
                      </button>
                    )}
                    {expense.notes && (
                      <p className="text-xs text-zinc-400 mt-1.5 rounded-lg bg-black/40 border border-white/5 px-2.5 py-1">
                        {expense.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-sm font-bold text-white tabular-nums">
                    -{formatRupiah(expense.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(expense)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors press-scale"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(expense.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors press-scale"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.last_page > 1 && (
        <div className="flex items-center justify-between pt-2 px-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-9 px-3 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold press-scale disabled:opacity-40 border border-border/50"
          >
            Sebelumnya
          </button>
          <span className="text-xs text-muted-foreground tabular-nums font-medium">
            Halaman {page} dari {pagination.last_page}
          </span>
          <button
            disabled={page >= pagination.last_page}
            onClick={() => setPage((p) => p + 1)}
            className="h-9 px-3 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold press-scale disabled:opacity-40 border border-border/50"
          >
            Selanjutnya
          </button>
        </div>
      )}

      {/* FAB (Mobile) */}
      <button
        onClick={openCreate}
        className="fixed bottom-20 right-4 sm:hidden h-13 w-13 rounded-full bg-white text-black shadow-xl shadow-black/50 z-40 press-scale flex items-center justify-center cursor-pointer"
        aria-label="Tambah pengeluaran"
      >
        <Plus className="h-6 w-6 stroke-[2.4]" />
      </button>

      {/* Reusable Responsive Expense Form Modal */}
      <ExpenseModal
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        expense={editing}
        onSave={handleSave}
      />

      {/* Reusable Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={deleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null);
        }}
        title="Hapus pengeluaran ini?"
        description="Data pengeluaran ini akan dihapus secara permanen dan saldo kas akan disesuaikan kembali."
        confirmLabel="Hapus pengeluaran"
        loading={deleting}
        onConfirm={() => {
          if (deleteConfirm) handleDelete(deleteConfirm);
        }}
      />

      {/* Receipt Detail Lightbox Modal Popup */}
      <ResponsiveModal
        open={viewingReceipt !== null}
        onOpenChange={(open) => {
          if (!open) setViewingReceipt(null);
        }}
      >
        <ResponsiveModalContent className="sm:max-w-md p-0 overflow-hidden bg-[#121214] border border-white/10 shadow-2xl rounded-3xl">
          {/* Header */}
          <div className="px-5 pt-5 pb-4">
            <ResponsiveModalHeader className="pb-0 pr-6">
              {/* Badge row: type label + amount */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap">
                  <Receipt className="h-3 w-3" />
                  Bukti Nota Pembelian
                </span>
                <span className="text-xs font-bold text-rose-400 font-variant-numeric tabular-nums bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                  -{viewingReceipt ? formatRupiah(viewingReceipt.amount) : ""}
                </span>
              </div>
              {/* Title */}
              <ResponsiveModalTitle className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                {viewingReceipt?.title}
              </ResponsiveModalTitle>
              {/* Date */}
              <ResponsiveModalDescription className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="tabular-nums font-medium">
                  {viewingReceipt?.expense_date ? formatDate(viewingReceipt.expense_date) : ""}
                </span>
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>
          </div>

          {/* Receipt Image — dark lightbox canvas */}
          <div className="relative bg-black/90 border-y border-white/[0.07] flex items-center justify-center p-4 sm:p-6 min-h-[240px] max-h-[55vh] overflow-hidden group">
            {viewingReceipt?.receipt_image ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getStorageUrl(viewingReceipt.receipt_image)}
                  alt={`Bukti nota ${viewingReceipt.title}`}
                  className="max-h-[48vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                  style={{ outline: "1px solid oklch(1 0 0 / 0.1)" }}
                />
                {/* Open full overlay button — appears on hover */}
                <a
                  href={getStorageUrl(viewingReceipt.receipt_image)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-end justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  aria-label="Buka gambar nota penuh"
                >
                  <span className="h-8 px-3 rounded-lg bg-black/70 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md text-[11px] font-medium flex items-center gap-1.5 transition-colors duration-150 press-scale shadow-lg">
                    <ZoomIn className="h-3.5 w-3.5" />
                    <span>Buka penuh</span>
                  </span>
                </a>
              </>
            ) : (
              /* Empty state — no receipt image uploaded */
              <div className="flex flex-col items-center justify-center gap-3 py-4 select-none">
                <div className="h-14 w-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-zinc-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-400">Tidak ada nota</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Bukti gambar belum diunggah</p>
                </div>
              </div>
            )}
          </div>

          {/* Details & Actions Footer */}
          <div className="px-4 sm:px-5 pt-4 pb-4 sm:pb-5 space-y-3 bg-[#121214]">
            {/* Quick Stat Tiles */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3.5 py-3">
                <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                  Nominal
                </span>
                <span className="font-bold text-white tabular-nums text-sm">
                  {viewingReceipt ? formatRupiah(viewingReceipt.amount) : "—"}
                </span>
              </div>
              <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] px-3.5 py-3">
                <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                  Tanggal
                </span>
                <span className="font-medium text-zinc-300 tabular-nums text-sm">
                  {viewingReceipt?.expense_date ? formatDate(viewingReceipt.expense_date) : "—"}
                </span>
              </div>
            </div>

            {/* Notes Section */}
            {viewingReceipt?.notes && (
              <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl px-3.5 py-3 flex items-start gap-2.5">
                <FileText className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                    Catatan
                  </span>
                  <p className="text-xs leading-[1.6] text-zinc-300" style={{ textWrap: "pretty" } as React.CSSProperties}>
                    {viewingReceipt.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Close action */}
            <button
              type="button"
              onClick={() => setViewingReceipt(null)}
              className="h-10 w-full rounded-2xl bg-white/[0.08] hover:bg-white/[0.13] active:bg-white/[0.06] text-white text-sm font-semibold transition-colors duration-150 press-scale flex items-center justify-center border border-white/10"
            >
              Tutup
            </button>
          </div>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </div>
  );
}
