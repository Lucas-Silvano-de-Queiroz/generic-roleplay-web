"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
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
    <motion.div
      whileHover={{ scale: 1.03, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={className}
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
    </motion.div>
  );
}