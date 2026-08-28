"use client";

import type { ReactNode } from "react";
import { Button } from "@/app/components/ui/button";

type MotionButtonProps = {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  asChild?: boolean;
  className?: string;
  buttonClassName?: string;
  children: ReactNode;
};

export function MotionButton({
  variant = "primary",
  size = "md",
  loading = false,
  asChild = false,
  className = "",
  buttonClassName = "",
  children,
}: MotionButtonProps) {
  return (
    <div
      className={[
        "transition-transform duration-200 ease-out hover:-translate-y-px hover:scale-[1.03] active:scale-[0.97]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Button
        variant={variant}
        size={size}
        loading={loading}
        asChild={asChild}
        className={buttonClassName}
      >
        {children}
      </Button>
    </div>
  );
}