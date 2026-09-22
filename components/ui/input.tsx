import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-base sm:text-sm text-white placeholder:text-zinc-500 transition-all outline-none",
        "focus-visible:border-white/40 focus-visible:ring-1 focus-visible:ring-white/20",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-danger aria-invalid:ring-1 aria-invalid:ring-danger/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
