"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function ResponsiveModal({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="responsive-modal" {...props} />;
}

function ResponsiveModalTrigger({
  ...props
}: DialogPrimitive.Trigger.Props) {
  return (
    <DialogPrimitive.Trigger data-slot="responsive-modal-trigger" {...props} />
  );
}

function ResponsiveModalPortal({
  ...props
}: DialogPrimitive.Portal.Props) {
  return (
    <DialogPrimitive.Portal data-slot="responsive-modal-portal" {...props} />
  );
}

function ResponsiveModalOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="responsive-modal-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

interface ResponsiveModalContentProps extends DialogPrimitive.Popup.Props {
  showCloseButton?: boolean;
}

function ResponsiveModalContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ResponsiveModalContentProps) {
  return (
    <ResponsiveModalPortal>
      <ResponsiveModalOverlay />
      <DialogPrimitive.Popup
        data-slot="responsive-modal-content"
        className={cn(
          // Universal reset
          "z-50 bg-[#141416] surface-card outline-none text-foreground",
          // Mobile (default < 640px): Slide-up Bottom Sheet
          "fixed inset-x-0 bottom-0 w-full max-h-[88vh] overflow-y-auto rounded-t-3xl p-5 border-t border-white/10 shadow-2xl",
          "data-open:animate-in data-open:slide-in-from-bottom-6 data-open:fade-in-0 duration-200",
          "data-closed:animate-out data-closed:slide-out-to-bottom-6 data-closed:fade-out-0",
          // Desktop (sm: >= 640px): Perfectly Centered Modal Dialog via inset-0 m-auto
          "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[85vh] sm:max-w-lg sm:rounded-2xl sm:border sm:border-white/10 sm:p-6 sm:shadow-2xl",
          "sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95",
          className
        )}
        style={{
          paddingBottom: "max(1.25rem, calc(env(safe-area-inset-bottom) + 0.75rem))",
        }}
        {...props}
      >
        {/* Mobile Pull Handle (drag indicator) */}
        <div className="mx-auto -mt-1 mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />

        {children}

        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="responsive-modal-close"
            className="absolute top-4 right-4 h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors press-scale"
            aria-label="Tutup dialog"
          >
            <XIcon className="h-4 w-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </ResponsiveModalPortal>
  );
}

function ResponsiveModalHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="responsive-modal-header"
      className={cn("flex flex-col gap-1 text-left pb-3 pr-8", className)}
      {...props}
    />
  );
}

function ResponsiveModalTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="responsive-modal-title"
      className={cn("text-lg font-bold text-white tracking-tight leading-snug", className)}
      {...props}
    />
  );
}

function ResponsiveModalDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="responsive-modal-description"
      className={cn("text-xs text-muted-foreground leading-relaxed", className)}
      {...props}
    />
  );
}

function ResponsiveModalFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="responsive-modal-footer"
      className={cn("flex items-center justify-end gap-2.5 pt-4 mt-2 border-t border-white/[0.06]", className)}
      {...props}
    />
  );
}

export {
  ResponsiveModal,
  ResponsiveModalTrigger,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
};
