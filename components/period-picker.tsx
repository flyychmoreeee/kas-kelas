"use client";

import { useState, useRef, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { MONTH_NAMES } from "@/lib/format";
import { cn } from "@/lib/utils";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

interface PeriodPickerProps {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  className?: string;
  disabled?: boolean;
  disabledText?: string;
  customIcon?: React.ReactNode;
}

export function PeriodPicker({
  month,
  year,
  onChange,
  className,
  disabled = false,
  disabledText,
  customIcon,
}: PeriodPickerProps) {
  const [open, setOpen] = useState(false);
  const [prevYear, setPrevYear] = useState(year);
  const [customNavYear, setCustomNavYear] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (year !== prevYear) {
    setPrevYear(year);
    setCustomNavYear(null);
  }

  const navYear = customNavYear ?? year;
  const setNavYear = (updater: number | ((prev: number) => number)) => {
    setCustomNavYear(typeof updater === "function" ? updater(navYear) : updater);
  };

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const label = disabled
    ? disabledText || "Semua Periode"
    : month === 0
    ? `Semua Bulan (${year})`
    : `${MONTH_NAMES[month]} ${year}`;

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-10 w-full rounded-xl border px-3.5 py-2 text-left flex items-center justify-between gap-2 transition-all outline-none press-scale",
          disabled
            ? "bg-amber-500/6 border-amber-500/20 text-amber-300/90 cursor-default"
            : open
            ? "border-white/40 ring-1 ring-white/20 bg-black/50 text-white"
            : "border-white/10 bg-black/40 text-white hover:border-white/20"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {customIcon || <CalendarIcon className="h-4 w-4 text-zinc-400 shrink-0" />}
          <span className="text-xs font-semibold truncate">{label}</span>
        </div>

        {!disabled && (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-zinc-400 shrink-0 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        )}
      </button>

      {open && !disabled && (
        <div className="absolute top-12 left-0 z-50 w-full sm:w-80 rounded-2xl bg-zinc-950 border border-white/15 p-3.5 shadow-2xl space-y-3 animate-in fade-in-0 zoom-in-95">
          {/* Year Stepper Navigation */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setNavYear((y) => y - 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-colors press-scale"
              title="Tahun sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="text-center">
              <span className="text-sm font-bold text-white tabular-nums">
                {navYear}
              </span>
              <span className="text-[10px] text-muted-foreground block -mt-0.5">
                Pilih Tahun & Bulan
              </span>
            </div>

            <button
              type="button"
              onClick={() => setNavYear((y) => y + 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-zinc-400 hover:text-white transition-colors press-scale"
              title="Tahun berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* "Semua Bulan" Full Period Button */}
          <button
            type="button"
            onClick={() => {
              onChange(0, navYear);
              setOpen(false);
            }}
            className={cn(
              "w-full h-8 rounded-xl text-xs font-semibold press-scale transition-all flex items-center justify-center border",
              month === 0 && year === navYear
                ? "bg-white text-black border-transparent shadow-sm font-bold"
                : "bg-black/40 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            Semua Bulan di {navYear}
          </button>

          {/* 12-Month Grid */}
          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-white/10">
            {MONTH_NAMES.slice(1).map((name, i) => {
              const m = i + 1;
              const isSelected = month === m && year === navYear;
              const isCurrent = m === currentMonth && navYear === currentYear;

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onChange(m, navYear);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-9 rounded-xl text-xs font-medium press-scale transition-all flex flex-col items-center justify-center border relative",
                    isSelected
                      ? "bg-white text-black font-bold border-transparent shadow-sm"
                      : "bg-black/30 border-white/5 text-zinc-300 hover:text-white hover:bg-white/10",
                    isCurrent && !isSelected && "ring-1 ring-white/20"
                  )}
                >
                  <span>{name.slice(0, 3)}</span>
                  {isCurrent && (
                    <span
                      className={cn(
                        "h-1 w-1 rounded-full absolute bottom-1",
                        isSelected ? "bg-black" : "bg-white"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
