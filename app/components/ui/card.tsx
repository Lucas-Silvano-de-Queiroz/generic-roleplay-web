import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={[
        "w-full max-w-md rounded-2xl border border-border/60 bg-card/90 p-8 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.8)] backdrop-blur-sm",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
