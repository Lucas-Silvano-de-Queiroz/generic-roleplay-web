import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={[
        "w-full max-w-md rounded-xl border border-border bg-background p-8 shadow-lg",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
