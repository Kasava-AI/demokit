import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Input style variants:
 * - default: Standard bordered input with focus ring
 * - subtle: Lighter border, minimal visual weight (good for inline search)
 * - ghost: No border until focus, very minimal
 * - underline: Only bottom border (Linear/Notion style)
 * - filled: Filled background, no border
 * - error: Red border for validation errors
 * - success: Green border for success state
 */
const inputVariants = cva(
  "flex w-full bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
  {
    variants: {
      variant: {
        default: "h-10 rounded-md border border-input px-3 py-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        subtle: "h-9 rounded-md border border-muted px-3 py-2 focus-visible:border-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-muted-foreground/20",
        ghost: "h-9 rounded-md border border-transparent px-3 py-2 hover:bg-muted/50 focus-visible:bg-background focus-visible:border-input focus-visible:ring-1 focus-visible:ring-ring",
        underline: "h-9 rounded-none border-0 border-b border-muted px-1 py-2 focus-visible:border-foreground",
        filled: "h-10 rounded-md border-0 bg-muted px-3 py-2 focus-visible:bg-muted/80 focus-visible:ring-1 focus-visible:ring-ring",
        error: "h-10 rounded-md border border-destructive px-3 py-2 focus-visible:ring-2 focus-visible:ring-destructive/20 focus-visible:border-destructive",
        success: "h-10 rounded-md border border-green-500 px-3 py-2 focus-visible:ring-2 focus-visible:ring-green-500/20 focus-visible:border-green-500",
      },
      inputSize: {
        default: "",
        sm: "h-8 text-xs px-2.5 py-1.5",
        lg: "h-11 text-base px-4 py-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof inputVariants>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, inputSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, inputSize, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }
