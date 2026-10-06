import { forwardRef } from "react";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string };
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, hint, id, className = "", ...props }, ref) => {
  const controlId = id ?? props.name;
  const errorId = error ? `${controlId}-error` : undefined;
  const hintId = hint ? `${controlId}-hint` : undefined;
  return <div className="flex flex-col gap-1.5">
    <label htmlFor={controlId} className="text-sm font-medium text-muted-foreground">{label}</label>
    <textarea ref={ref} id={controlId} aria-invalid={error ? true : undefined} aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined} className={["min-h-28 w-full resize-y rounded-xl border border-input bg-muted/40 px-4 py-3 text-base", "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20", error && "border-destructive/60", className].join(" ")} {...props} />
    {hint && <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>}
    {error && <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
});
Textarea.displayName = "Textarea";
