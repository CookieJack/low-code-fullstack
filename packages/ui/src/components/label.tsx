"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "../lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "flex select-none items-center gap-2 text-xs font-medium text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
