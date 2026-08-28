import { Children, cloneElement, forwardRef, type ReactElement } from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  asChild?: boolean;
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring",
  outline:
    "border border-border/70 text-foreground hover:bg-muted focus-visible:ring-ring",
  ghost:
    "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading = false, asChild = false, className = "", children, disabled, ...props },
    ref
  ) => {
    const classes = [
      "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:pointer-events-none disabled:opacity-60",
      variantClasses[variant],
      sizeClasses[size],
      className,
    ].join(" ");

    const content = (
      <>
        {loading && (
          <span
            aria-hidden
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {children}
      </>
    );

    if (asChild) {
      const child = Children.only(children) as ReactElement<Record<string, unknown>>;
      const childProps = child.props as {
        className?: unknown;
        onClick?: unknown;
        [key: string]: unknown;
      };
      const { className: childClassName, onClick, ...rest } = childProps;
      return cloneElement(
        child as ReactElement<Record<string, unknown>>,
        {
          className: [classes, childClassName ?? ""].join(" "),
          ...(onClick ? {} : rest),
        } as Record<string, unknown>
      ) as ReactElement;
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
