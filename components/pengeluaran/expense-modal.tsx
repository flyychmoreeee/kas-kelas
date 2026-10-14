"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ImagePlus, X, Upload, Calendar as CalendarIcon } from "lucide-react";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getStorageUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { KasExpense } from "@/types/types";

interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: KasExpense | null;
  onSave: (payload: {
    title: string;
    amount: number;
    expense_date: string;
    receipt_image?: File;
    notes?: string;
  }) => Promise<void>;
}

/**
 * Format a number into Indonesian Rupiah display string for the input.
 */
function formatAmountDisplay(value: number | string): string {
  const num =
    typeof value === "string"
      ? parseInt(value.replace(/\D/g, ""), 10)
      : value;
  if (!num || isNaN(num)) return "";
  return new Intl.NumberFormat("id-ID").format(num);
}

/**
 * Format Date to YYYY-MM-DD in local time without UTC offset shifting.
 */
function toDateInputValue(d?: Date): string {
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string into a Date object in local time.
 */
function parseDateValue(dateStr?: string | null): Date | undefined {
  if (!dateStr) return undefined;
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m - 1, d);
    }
  }
  return undefined;
}

/**
 * Parse a formatted Rupiah string back to a raw number.
 */
function parseAmountValue(display: string): number {
  const raw = display.replace(/\D/g, "");
  return parseInt(raw, 10) || 0;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function ExpenseModal({
  open,
  onOpenChange,
  expense,
  onSave,
}: ExpenseModalProps) {
  const [saving, setSaving] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState(() =>
    expense?.amount ? formatAmountDisplay(expense.amount) : ""
  );
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(() =>
    expense?.expense_date ? parseDateValue(expense.expense_date) : new Date()
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [keepExisting, setKeepExisting] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when expense or open changes (matching week-modal pattern)
  const [prevExpenseId, setPrevExpenseId] = useState<number | null | undefined>(expense?.id);
  const [prevOpen, setPrevOpen] = useState(open);

  if (expense?.id !== prevExpenseId || open !== prevOpen) {
    setPrevExpenseId(expense?.id);
    setPrevOpen(open);
    if (open) {
      setAmountDisplay(
        expense?.amount ? formatAmountDisplay(expense.amount) : ""
      );
      setExpenseDate(
        expense?.expense_date ? parseDateValue(expense.expense_date) : new Date()
      );
      setCalendarOpen(false);
      setReceiptFile(null);
      setReceiptPreview(null);
      setKeepExisting(true);
      setFileError(null);
      setDragOver(false);
    }
  }

  // Clean up object URL on unmount or change
  useEffect(() => {
    return () => {
      if (receiptPreview && receiptPreview.startsWith("blob:")) {
        URL.revokeObjectURL(receiptPreview);
      }
    };
  }, [receiptPreview]);

  const validateAndSetFile = useCallback((file: File) => {
    setFileError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("Format file harus JPG, PNG, atau WebP");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("Ukuran file maksimal 2MB");
      return;
    }

    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setKeepExisting(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeReceipt = () => {
    if (receiptPreview && receiptPreview.startsWith("blob:")) {
      URL.revokeObjectURL(receiptPreview);
    }
    setReceiptFile(null);
    setReceiptPreview(null);
    setKeepExisting(false);
    setFileError(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const digits = rawInput.replace(/\D/g, "");
    if (!digits) {
      setAmountDisplay("");
      return;
    }
    const num = parseInt(digits, 10);
    setAmountDisplay(formatAmountDisplay(num));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const amount = parseAmountValue(amountDisplay);

    if (amount < 1) {
      setSaving(false);
      return;
    }

    const payload: {
      title: string;
      amount: number;
      expense_date: string;
      receipt_image?: File;
      notes?: string;
    } = {
      title: form.get("title") as string,
      amount,
      expense_date: form.get("expense_date") as string,
      notes: (form.get("notes") as string) || undefined,
    };

    if (receiptFile) {
      payload.receipt_image = receiptFile;
    }

    try {
      await onSave(payload);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  // Determine what preview to show
  const hasNewFile = receiptFile !== null && receiptPreview !== null;
  const hasExistingImage =
    keepExisting && expense?.receipt_image && !hasNewFile;
  const showPreview = hasNewFile || hasExistingImage;
  const previewSrc = hasNewFile
    ? receiptPreview!
    : hasExistingImage
      ? getStorageUrl(expense!.receipt_image!)
      : null;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="sm:max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {expense ? "Edit pengeluaran" : "Catat pengeluaran baru"}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {expense
              ? "Perbarui rincian atau nominal pengeluaran kas."
              : "Catat pengeluaran kas seperti perlengkapan kelas atau konsumsi."}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <form
          key={expense ? `edit-${expense.id}` : "create"}
          onSubmit={handleSubmit}
          className="space-y-4 pt-1"
        >
          <FieldGroup className="gap-3.5">
            {/* Title Field */}
            <Field className="gap-1.5">
              <FieldLabel
                htmlFor="expense-title"
                className="text-xs font-semibold text-zinc-300"
              >
                Keperluan atau barang
              </FieldLabel>
              <Input
                id="expense-title"
                name="title"
                placeholder="Contoh: Beli spidol & penghapus papan tulis"
                defaultValue={expense?.title ?? ""}
                required
              />
            </Field>

            {/* Amount Field — Rupiah formatted */}
            <Field className="gap-1.5">
              <FieldLabel
                htmlFor="expense-amount"
                className="text-xs font-semibold text-zinc-300"
              >
                Nominal pengeluaran
              </FieldLabel>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 pointer-events-none select-none">
                  Rp
                </span>
                <Input
                  id="expense-amount"
                  type="text"
                  inputMode="numeric"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  placeholder="0"
                  required
                  className="tabular-nums ps-10"
                />
              </div>
              <FieldDescription className="text-[11px] text-muted-foreground mt-0.5">
                {parseAmountValue(amountDisplay) > 0
                  ? `Rp ${formatAmountDisplay(parseAmountValue(amountDisplay))}`
                  : "Masukkan angka nominal pengeluaran"}
              </FieldDescription>
            </Field>

            {/* Date Field */}
            <Field className="gap-1.5">
              <FieldLabel
                htmlFor="expense-date-btn"
                className="text-xs font-semibold text-zinc-300"
              >
                Tanggal pengeluaran
              </FieldLabel>
              <button
                id="expense-date-btn"
                type="button"
                onClick={() => setCalendarOpen((prev) => !prev)}
                className={cn(
                  "h-10 w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-left flex items-center justify-between transition-all outline-none press-scale",
                  calendarOpen && "border-white/40 ring-1 ring-white/20"
                )}
              >
                <span
                  className={
                    expenseDate
                      ? "text-sm text-white font-medium"
                      : "text-sm text-zinc-500"
                  }
                >
                  {expenseDate
                    ? formatDate(toDateInputValue(expenseDate))
                    : "Pilih tanggal dari kalender..."}
                </span>
                <CalendarIcon className="h-4 w-4 text-zinc-400 shrink-0" />
              </button>

              {/* Hidden input to maintain form data compatibility */}
              <input
                type="hidden"
                name="expense_date"
                value={toDateInputValue(expenseDate) || toDateInputValue(new Date())}
              />

              {/* Inline Expandable Calendar Picker */}
              {calendarOpen && (
                <div className="mt-1 p-2 rounded-2xl bg-black/80 border border-white/10 flex justify-center shadow-xl">
                  <Calendar
                    mode="single"
                    selected={expenseDate}
                    onSelect={(date) => {
                      if (date) {
                        setExpenseDate(date);
                      }
                      setCalendarOpen(false);
                    }}
                    className="rounded-xl"
                  />
                </div>
              )}
            </Field>

            {/* Receipt Image Upload Field */}
            <Field className="gap-1.5">
              <FieldLabel className="text-xs font-semibold text-zinc-300">
                Bukti nota (opsional)
              </FieldLabel>

              {showPreview && previewSrc ? (
                /* Preview: selected file or existing image */
                <div className="relative rounded-xl border border-white/10 bg-black/40 overflow-hidden group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewSrc}
                    alt="Preview bukti nota"
                    className="w-full max-h-44 object-contain bg-black/60"
                  />
                  {/* Remove / replace overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-3 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold hover:bg-white/25 transition-colors flex items-center gap-1.5"
                    >
                      <Upload className="h-3 w-3" />
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={removeReceipt}
                      className="h-8 px-3 rounded-lg bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
                    >
                      <X className="h-3 w-3" />
                      Hapus
                    </button>
                  </div>
                  {/* File name badge */}
                  {receiptFile && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="inline-block text-[10px] text-white/70 bg-black/60 backdrop-blur-sm rounded-md px-2 py-0.5 truncate max-w-full">
                        {receiptFile.name}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Drop zone / upload trigger */
                <label
                  htmlFor="expense-receipt-input"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`
                    flex flex-col items-center justify-center gap-2 py-6 px-4
                    rounded-xl border-2 border-dashed cursor-pointer
                    transition-all duration-200
                    ${
                      dragOver
                        ? "border-white/40 bg-white/5"
                        : "border-white/10 bg-black/20 hover:border-white/25 hover:bg-black/30"
                    }
                    ${fileError ? "border-red-500/40 bg-red-500/5" : ""}
                  `}
                >
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                      fileError
                        ? "bg-red-500/10 text-red-400"
                        : "bg-white/5 text-zinc-400"
                    }`}
                  >
                    <ImagePlus className="h-5 w-5 stroke-[1.5]" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-semibold text-zinc-300 block">
                      Klik atau seret foto nota
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      JPG, PNG, WebP · Maks. 2MB
                    </span>
                  </div>
                </label>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                id="expense-receipt-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* File error message */}
              {fileError && (
                <p className="text-[11px] text-red-400 font-medium mt-0.5">
                  {fileError}
                </p>
              )}
            </Field>

            {/* Notes Field */}
            <Field className="gap-1.5">
              <FieldLabel
                htmlFor="expense-notes"
                className="text-xs font-semibold text-zinc-300"
              >
                Catatan tambahan (opsional)
              </FieldLabel>
              <Input
                id="expense-notes"
                name="notes"
                placeholder="Contoh: Nota tersimpan di map bendahara"
                defaultValue={expense?.notes ?? ""}
              />
              <FieldDescription className="text-[11px] text-muted-foreground mt-0.5">
                Keterangan tempat pembelian atau lokasi nota/bukti fisik.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {/* Responsive Action Buttons */}
          <ResponsiveModalFooter className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-10 px-4 rounded-xl text-xs font-semibold press-scale bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 px-4 rounded-xl text-xs font-semibold press-scale bg-white text-black hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              <span>
                {expense ? "Simpan perubahan" : "Catat pengeluaran"}
              </span>
            </button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
