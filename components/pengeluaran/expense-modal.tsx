"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import type { KasExpense } from "@/types/types";

interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: KasExpense | null;
  onSave: (payload: {
    title: string;
    amount: number;
    expense_date: string;
    notes?: string;
  }) => Promise<void>;
}

export function ExpenseModal({
  open,
  onOpenChange,
  expense,
  onSave,
}: ExpenseModalProps) {
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get("title") as string,
      amount: Number(form.get("amount")),
      expense_date: form.get("expense_date") as string,
      notes: (form.get("notes") as string) || undefined,
    };

    try {
      await onSave(payload);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

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
              <FieldLabel htmlFor="expense-title" className="text-xs font-semibold text-zinc-300">
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

            {/* Amount Field */}
            <Field className="gap-1.5">
              <FieldLabel htmlFor="expense-amount" className="text-xs font-semibold text-zinc-300">
                Nominal pengeluaran (Rp)
              </FieldLabel>
              <Input
                id="expense-amount"
                name="amount"
                type="number"
                min={1}
                placeholder="Contoh: 25000"
                defaultValue={expense?.amount ?? ""}
                required
                className="tabular-nums"
              />
            </Field>

            {/* Date Field */}
            <Field className="gap-1.5">
              <FieldLabel htmlFor="expense-date" className="text-xs font-semibold text-zinc-300">
                Tanggal pengeluaran
              </FieldLabel>
              <Input
                id="expense-date"
                name="expense_date"
                type="date"
                defaultValue={
                  expense?.expense_date ??
                  new Date().toISOString().split("T")[0]
                }
                required
              />
            </Field>

            {/* Notes Field */}
            <Field className="gap-1.5">
              <FieldLabel htmlFor="expense-notes" className="text-xs font-semibold text-zinc-300">
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

          {/* Responsive Action Buttons (Grid on mobile, right-aligned on desktop) */}
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
              <span>{expense ? "Simpan perubahan" : "Catat pengeluaran"}</span>
            </button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
