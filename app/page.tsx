"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getOverview } from "@/lib/api";
import { formatRupiah, formatDate } from "@/lib/format";
import type { OverviewData } from "@/types/types";

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOverview()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="rounded-2xl bg-danger/10 p-4 mb-4 text-danger border border-danger/20">
          <Wallet className="h-10 w-10 stroke-[1.5]" />
        </div>
        <p className="text-lg font-bold mb-1 text-white">Tidak dapat memuat ringkasan kas</p>
        <p className="text-xs text-muted-foreground mb-4 max-w-[280px] leading-relaxed">
          {error || "Periksa koneksi jaringan atau server lokal, kemudian coba kembali."}
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="rounded-xl press-scale border-white/10 text-white hover:bg-white/10"
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const aw = data.active_week;
  const percentage = aw
    ? Math.round((aw.paid_count / Math.max(aw.total_students, 1)) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-lg px-4 pt-8 pb-24 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Bendahara Kas
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ringkasan keuangan dan status iuran kelas
          </p>
        </div>
        <Link href="/kas">
          <button className="h-8 px-3 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold press-scale hover:bg-secondary/80 transition-colors border border-border/60">
            Kelola minggu
          </button>
        </Link>
      </div>

      {/* Main Balance Card (Obsidian Dark with High-Contrast White Metrics) */}
      <div className="surface-card rounded-2xl bg-card border border-border/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
            SALDO KAS SAAT INI
          </span>
        </div>

        <div>
          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white tabular-nums">
            {formatRupiah(data.balance)}
          </p>
        </div>

        {/* Sub-panels for Inflow & Outflow (Recessed Dark Wells) */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="rounded-xl bg-black/40 border border-white/10 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1">
              TOTAL PEMASUKAN
            </span>
            <p className="text-base font-bold text-white tabular-nums tracking-tight">
              {formatRupiah(data.total_income)}
            </p>
            <span className="text-[11px] text-success font-medium mt-0.5 inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3 stroke-[2.5]" /> Kas masuk
            </span>
          </div>

          <div className="rounded-xl bg-black/40 border border-white/10 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block mb-1">
              TOTAL PENGELUARAN
            </span>
            <p className="text-base font-bold text-white tabular-nums tracking-tight">
              {formatRupiah(data.total_expense)}
            </p>
            <span className="text-[11px] text-danger font-medium mt-0.5 inline-flex items-center gap-1">
              <TrendingDown className="h-3 w-3 stroke-[2.5]" /> Terpakai
            </span>
          </div>
        </div>

        <Link href="/matrix" className="block pt-1">
          <button className="w-full h-11 rounded-xl bg-white text-black font-semibold text-sm press-scale hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 shadow-sm">
            <span>Lihat matriks pembayaran</span>
            <ArrowRight className="h-4 w-4 stroke-[2.2]" />
          </button>
        </Link>
      </div>

      {/* Active Week Card (matches reference 'Savings Targets' & 'Payout Threshold') */}
      {aw ? (
        <div className="surface-card rounded-2xl bg-card border border-border/50 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
                MINGGU AKTIF
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                {aw.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                Target: {formatRupiah(aw.amount * aw.total_students)} • {formatRupiah(aw.amount)} / siswa
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold tabular-nums border border-border/40">
              {percentage}%
            </span>
          </div>

          {/* Metric & Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-white tracking-tight tabular-nums">
                {formatRupiah(aw.collected)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {aw.paid_count} dari {aw.total_students} siswa lunas
              </span>
            </div>

            {/* Custom High-Contrast Progress Bar (White on Dark Track) */}
            <div className="h-2 w-full rounded-full bg-black/50 border border-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
              />
            </div>
          </div>

          {/* 3-Pill Recessed Summary */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-xl bg-black/40 border border-white/10 p-2.5 text-center">
              <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                TOTAL SISWA
              </span>
              <p className="text-sm font-bold text-white tabular-nums mt-0.5">
                {aw.total_students}
              </p>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/10 p-2.5 text-center">
              <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                LUNAS
              </span>
              <p className="text-sm font-bold text-success tabular-nums mt-0.5">
                {aw.paid_count}
              </p>
            </div>
            <div className="rounded-xl bg-black/40 border border-white/10 p-2.5 text-center">
              <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                BELUM BAYAR
              </span>
              <p className="text-sm font-bold text-warning tabular-nums mt-0.5">
                {aw.unpaid_count}
              </p>
            </div>
          </div>

          {/* Primary Action Button (Solid White with Black Text, Verb-First) */}
          <Link href={`/kas/${aw.id}`} className="block pt-1">
            <button className="w-full h-11 rounded-xl bg-white text-black font-semibold text-sm press-scale hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 shadow-sm">
              <span>Catat pembayaran siswa</span>
              <ArrowRight className="h-4 w-4 stroke-[2.2]" />
            </button>
          </Link>
        </div>
      ) : (
        <div className="surface-card rounded-2xl bg-card border border-border/50 p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-white">Belum ada minggu aktif</p>
          <p className="text-xs text-muted-foreground max-w-[260px] mx-auto leading-relaxed">
            Buat periode minggu kas baru untuk mulai mencatat dan memantau iuran siswa.
          </p>
          <Link href="/kas" className="inline-block">
            <button className="h-9 px-4 rounded-xl bg-white text-black text-xs font-semibold press-scale hover:bg-neutral-200 transition-all shadow-sm">
              Buat minggu kas
            </button>
          </Link>
        </div>
      )}

      {/* Recent Expenses Card */}
      {data.recent_expenses.length > 0 && (
        <div className="surface-card rounded-2xl bg-card border border-border/50 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
                AKTIVITAS TERAKHIR
              </span>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                Pengeluaran terbaru
              </h2>
            </div>
            <Link href="/pengeluaran">
              <button className="text-xs text-muted-foreground hover:text-white font-medium press-scale transition-colors">
                Lihat semua
              </button>
            </Link>
          </div>

          <div className="rounded-xl bg-black/40 border border-white/10 divide-y divide-white/10 overflow-hidden">
            {data.recent_expenses.slice(0, 4).map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-xs font-semibold text-white truncate">
                    {expense.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                    {formatDate(expense.expense_date)}
                  </p>
                </div>
                <span className="text-xs font-bold text-danger tabular-nums shrink-0">
                  -{formatRupiah(expense.amount)}
                </span>
              </div>
            ))}
          </div>

          <Link href="/pengeluaran" className="block pt-1">
            <button className="w-full h-10 rounded-xl bg-secondary text-secondary-foreground font-semibold text-xs press-scale hover:bg-secondary/80 transition-all border border-border/50 flex items-center justify-center gap-1.5">
              <Plus className="h-3.5 w-3.5 stroke-[2.2]" />
              <span>Catat pengeluaran</span>
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-lg px-4 pt-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-36 rounded-lg" />
          <Skeleton className="h-3 w-48 mt-1 rounded-md" />
        </div>
        <Skeleton className="h-8 w-24 rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
