"use client";

import { cn } from "@/lib/utils";

export default function GradientText({ children, className, as: Tag = "span" }) {
  return (
    <Tag
      className={cn(
        "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent",
        className
      )}
    >
      {children}
    </Tag>
  );
}
