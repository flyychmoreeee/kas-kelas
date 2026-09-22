"use client";

import { Loader2 } from "lucide-react";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal";

interface ConfirmDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
}

export function ConfirmDeleteModal({
  open,
  onOpenChange,
  title = "Hapus data ini?",
  description = "Aksi ini tidak dapat dibatalkan. Data yang dihapus akan hilang secara permanen.",
  confirmLabel = "Hapus",
  onConfirm,
  loading = false,
}: ConfirmDeleteModalProps) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="sm:max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <ResponsiveModalFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl h-10 text-xs font-semibold press-scale flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl h-10 text-xs font-semibold press-scale flex-1 bg-danger hover:bg-danger/90 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            <span>{confirmLabel}</span>
          </button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
