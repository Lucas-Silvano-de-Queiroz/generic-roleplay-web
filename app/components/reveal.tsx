"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ReactNode,
} from "react";

export function Stagger({
  children,
  className = "",
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const items = Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, index) => {
        if (!isValidElement<{ style?: CSSProperties }>(child)) {
          return child;
        }
        const style = {
          animationDelay: `${index * stagger}s`,
          ...(child.props.style ?? {}),
        } as CSSProperties;
        return cloneElement(child, { style });
      })}
    </div>
  );
}

export function Reveal({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={["animate-fade-up", className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}

export function RevealOnMount({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={["animate-fade-up", className].filter(Boolean).join(" ")}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
