import { Children, cloneElement, forwardRef, type ReactElement } from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  asChild?: boolean;
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 focus-visible:ring-primary",
  outline:
    "border border-border bg-transparent hover:bg-muted focus-visible:ring-primary",
  ghost: "bg-transparent hover:bg-muted focus-visible:ring-primary",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading = false, asChild = false, className = "", children, disabled, ...props },
    ref
  ) => {
    const classes = [
      "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
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
