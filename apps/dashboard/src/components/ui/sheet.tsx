"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  forceMount,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal> & {
  forceMount?: true;
}) {
  return (
    <SheetPrimitive.Portal
      data-slot="sheet-portal"
      forceMount={forceMount}
      {...props}
    />
  );
}

function SheetOverlay({
  className,
  prefersReducedMotion,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay> & {
  prefersReducedMotion?: boolean;
}) {
  return (
    <SheetPrimitive.Overlay
      asChild
      forceMount
      data-slot="sheet-overlay"
      {...props}
    >
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0 }}
        animate={prefersReducedMotion ? {} : { opacity: 1 }}
        exit={prefersReducedMotion ? {} : { opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn("fixed inset-0 z-50 bg-black/50", className)}
      />
    </SheetPrimitive.Overlay>
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  open,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  open?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();

  // Direction-based animation values
  const slideVariants = {
    right: { x: "100%" },
    left: { x: "-100%" },
    top: { y: "-100%" },
    bottom: { y: "100%" },
  };

  const slideIn = slideVariants[side];
  const slideOut = { x: 0, y: 0 };

  return (
    <AnimatePresence>
      {open && (
        <SheetPortal forceMount>
          <SheetOverlay prefersReducedMotion={prefersReducedMotion} />
          <SheetPrimitive.Content
            asChild
            forceMount
            data-slot="sheet-content"
            {...props}
          >
            <motion.div
              initial={prefersReducedMotion ? {} : slideIn}
              animate={prefersReducedMotion ? {} : slideOut}
              exit={prefersReducedMotion ? {} : slideIn}
              transition={
                prefersReducedMotion
                  ? {}
                  : {
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }
              }
              className={cn(
                "bg-background px-4 fixed z-50 flex flex-col gap-4 shadow-lg",
                side === "right" &&
                  "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
                side === "left" &&
                  "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
                side === "top" && "inset-x-0 top-0 h-auto border-b",
                side === "bottom" && "inset-x-0 bottom-0 h-auto border-t",
                className
              )}
            >
              {children}
              <SheetPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 cursor-pointer rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none">
                <XIcon className="size-4" />
                <span className="sr-only">Close</span>
              </SheetPrimitive.Close>
            </motion.div>
          </SheetPrimitive.Content>
        </SheetPortal>
      )}
    </AnimatePresence>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
