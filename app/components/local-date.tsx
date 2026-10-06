"use client";
import { useSyncExternalStore } from "react";

const subscribeToTimezone = () => () => undefined;
export function LocalDate({ value }: { value: string }) {
  const date = useSyncExternalStore(subscribeToTimezone, () => new Date(value).toLocaleDateString("pt-BR"), () => new Date(value).toISOString().slice(0, 10));
  return <time dateTime={value}>{date}</time>;
}
