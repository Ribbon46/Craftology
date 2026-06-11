import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border-[1.5px] border-input bg-transparent px-2.5 py-2 text-base transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-clay focus-visible:shadow-[3px_3px_0_0_var(--focus-press)] disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:shadow-[3px_3px_0_0] aria-invalid:shadow-destructive/40 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive dark:aria-invalid:shadow-destructive/60",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
