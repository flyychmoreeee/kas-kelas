"use client";

import { useState } from "react";
import {
  Loader2,
  CalendarRange,
  Sparkles,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
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
import { formatDate } from "@/lib/format";
import type { KasWeek } from "@/types/types";
import { cn } from "@/lib/utils";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

function toDateInputValue(d?: Date): string {
  if (!d) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

export interface WeekModalPayload {
  title: string;
  type: "routine" | "incidental";
  description?: string | null;
  week?: number | null;
  month?: number | null;
  year?: number | null;
  amount: number;
  due_date?: string | null;
  is_active: boolean;
}

interface WeekModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  week: KasWeek | null;
  onSave: (payload: WeekModalPayload) => Promise<void>;
}

export function WeekModal({
  open,
  onOpenChange,
  week,
  onSave,
}: WeekModalProps) {
  const [saving, setSaving] = useState(false);

  // Derive initial type from week prop
  const defaultType: "routine" | "incidental" = week
    ? week.type || (week.week ? "routine" : "incidental")
    : "routine";

  // State for user selection & tracking props changes without effect
  const [selectedType, setSelectedType] = useState<"routine" | "incidental" | null>(null);
  const [prevWeekId, setPrevWeekId] = useState<number | null | undefined>(week?.id);
  const [selectedDueDate, setSelectedDueDate] = useState<Date | undefined>(() =>
    parseDateValue(week?.due_date)
  );
  const [calendarOpen, setCalendarOpen] = useState(false);

  if (week?.id !== prevWeekId) {
    setPrevWeekId(week?.id);
    setSelectedType(null);
    setSelectedDueDate(parseDateValue(week?.due_date));
    setCalendarOpen(false);
  }

  const type = selectedType ?? defaultType;
  const setType = (newType: "routine" | "incidental") => {
    setSelectedType(newType);
    setCalendarOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const isRoutine = type === "routine";

    const weekVal = form.get("week");
    const monthVal = form.get("month");
    const yearVal = form.get("year");
    const dueDateVal = form.get("due_date");
    const descVal = form.get("description");

    const payload: WeekModalPayload = {
      title: (form.get("title") as string).trim(),
      type,
      description: descVal ? String(descVal).trim() : null,
      week: isRoutine ? Number(weekVal) : null,
      month: isRoutine ? Number(monthVal) : null,
      year: isRoutine ? Number(yearVal) : null,
      amount: Number(form.get("amount")),
      due_date: dueDateVal ? String(dueDateVal).trim() : null,
      is_active: form.get("is_active") === "on",
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
            {week
              ? type === "routine"
                ? "Edit Minggu Kas"
                : "Edit Iuran Khusus"
              : type === "routine"
              ? "Tambah Minggu Kas Baru"
              : "Tambah Iuran Khusus"}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {type === "routine"
              ? "Kelola periode minggu kas berkala dan tarif iuran mingguan."
              : "Catat iuran insidental di luar kas mingguan (lomba, kaos, acara, dll)."}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        {/* Type Toggle Segmented Control */}
        <div className="pt-1">
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black/40 border border-white/10 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setType("routine")}
              className={cn(
                "py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 press-scale",
                type === "routine"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              <span>Kas Mingguan</span>
            </button>
            <button
              type="button"
              onClick={() => setType("incidental")}
              className={cn(
                "py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 press-scale",
                type === "incidental"
                  ? "bg-white text-black shadow-sm font-bold"
                  : "text-muted-foreground hover:text-white"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Iuran Khusus</span>
            </button>
          </div>
        </div>

        <form
          key={week ? `edit-${week.id}-${type}` : `create-${type}`}
          onSubmit={handleSubmit}
          className="space-y-4 pt-2"
        >
          <FieldGroup className="gap-3.5">
            {/* Title Field */}
            <Field className="gap-1.5">
              <FieldLabel htmlFor="week-title" className="text-xs font-semibold text-zinc-300">
                {type === "routine" ? "Judul periode" : "Nama iuran / kegiatan"}
              </FieldLabel>
              <Input
                id="week-title"
                name="title"
                placeholder={
                  type === "routine"
                    ? "Contoh: Minggu 1 – September 2026"
                    : "Contoh: Iuran Pendaftaran Lomba Futsal"
                }
                defaultValue={week?.title ?? ""}
                required
              />
            </Field>

            {/* If incidental: description */}
            {type === "incidental" && (
              <Field className="gap-1.5">
                <FieldLabel htmlFor="week-description" className="text-xs font-semibold text-zinc-300">
                  Keterangan <span className="text-muted-foreground font-normal">(opsional)</span>
                </FieldLabel>
                <Input
                  id="week-description"
                  name="description"
                  placeholder="Contoh: Untuk biaya pendaftaran tim dan konsumsi"
                  defaultValue={week?.description ?? ""}
                />
              </Field>
            )}

            {/* Routine: Week / Month / Year Group */}
            {type === "routine" ? (
              <div className="grid grid-cols-3 gap-2">
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="week-num" className="text-xs font-semibold text-zinc-300">
                    Minggu ke-
                  </FieldLabel>
                  <Input
                    id="week-num"
                    name="week"
                    type="number"
                    min={1}
                    max={5}
                    defaultValue={week?.week ?? 1}
                    required
                    className="tabular-nums"
                  />
                </Field>

                <Field className="gap-1.5">
                  <FieldLabel htmlFor="week-month" className="text-xs font-semibold text-zinc-300">
                    Bulan
                  </FieldLabel>
                  <Input
                    id="week-month"
                    name="month"
                    type="number"
                    min={1}
                    max={12}
                    defaultValue={week?.month ?? currentMonth}
                    required
                    className="tabular-nums"
                  />
                </Field>

                <Field className="gap-1.5">
                  <FieldLabel htmlFor="week-year" className="text-xs font-semibold text-zinc-300">
                    Tahun
                  </FieldLabel>
                  <Input
                    id="week-year"
                    name="year"
                    type="number"
                    min={2020}
                    max={2030}
                    defaultValue={week?.year ?? currentYear}
                    required
                    className="tabular-nums"
                  />
                </Field>
              </div>
            ) : (
              /* Incidental: Tenggat Pembayaran dengan Kalender (Tanpa Bulan & Tahun) */
              <Field className="gap-1.5">
                <div className="flex items-center justify-between">
                  <FieldLabel className="text-xs font-semibold text-zinc-300">
                    Tenggat pembayaran <span className="text-muted-foreground font-normal">(opsional)</span>
                  </FieldLabel>
                  {selectedDueDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDueDate(undefined)}
                      className="text-[11px] text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      <span>Hapus tanggal</span>
                    </button>
                  )}
                </div>

                {/* Calendar Input Button */}
                <button
                  type="button"
                  onClick={() => setCalendarOpen((prev) => !prev)}
                  className={cn(
                    "h-10 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-left flex items-center justify-between transition-all outline-none press-scale",
                    calendarOpen && "border-white/40 ring-1 ring-white/20"
                  )}
                >
                  <span
                    className={
                      selectedDueDate
                        ? "text-sm text-white font-medium"
                        : "text-sm text-zinc-500"
                    }
                  >
                    {selectedDueDate
                      ? formatDate(toDateInputValue(selectedDueDate))
                      : "Pilih tanggal dari kalender..."}
                  </span>
                  <CalendarIcon className="h-4 w-4 text-zinc-400 shrink-0" />
                </button>

                {/* Hidden input to pass to FormData */}
                <input
                  type="hidden"
                  name="due_date"
                  value={toDateInputValue(selectedDueDate)}
                />

                {/* Inline Expandable Calendar Picker */}
                {calendarOpen && (
                  <div className="mt-1 p-2 rounded-2xl bg-black/80 border border-white/10 flex justify-center shadow-xl">
                    <Calendar
                      mode="single"
                      selected={selectedDueDate}
                      onSelect={(d) => {
                        setSelectedDueDate(d);
                        setCalendarOpen(false);
                      }}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </Field>
            )}

            {/* Amount Field */}
            <Field className="gap-1.5">
              <FieldLabel htmlFor="week-amount" className="text-xs font-semibold text-zinc-300">
                Tarif iuran per siswa (Rp)
              </FieldLabel>
              <Input
                id="week-amount"
                name="amount"
                type="number"
                min={0}
                step={500}
                placeholder="Contoh: 5000"
                defaultValue={week?.amount ?? (type === "routine" ? 5000 : 10000)}
                required
                className="tabular-nums"
              />
              <FieldDescription className="text-[11px] text-muted-foreground mt-0.5">
                {type === "routine"
                  ? "Nominal kas mingguan wajib per siswa untuk minggu ini."
                  : "Nominal iuran yang dibebankan kepada setiap siswa."}
              </FieldDescription>
            </Field>

            {/* Active Switch / Checkbox */}
            <Field orientation="horizontal" className="pt-1 flex items-center gap-2.5">
              <input
                type="checkbox"
                name="is_active"
                id="week-is-active"
                defaultChecked={week?.is_active ?? true}
                className="h-4 w-4 rounded-md border-border bg-black/40 accent-white cursor-pointer"
              />
              <label
                htmlFor="week-is-active"
                className="cursor-pointer text-xs font-medium text-zinc-300 select-none"
              >
                {type === "routine"
                  ? "Jadikan minggu aktif saat ini"
                  : "Jadikan iuran khusus aktif saat ini"}
              </label>
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
                {week
                  ? "Simpan perubahan"
                  : type === "routine"
                  ? "Buat minggu kas"
                  : "Buat iuran khusus"}
              </span>
            </button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
