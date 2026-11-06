import React from "react";
import styles from "./Button.module.css";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  /** Accepted for compatibility; buttons are always pill-shaped here. */
  shape?: "pill" | "default";
  /** Style the single child element (e.g. a link) instead of rendering a button. */
  asChild?: boolean;
};

export const Button = ({
  variant = "primary",
  size = "md",
  shape: _shape,
  asChild,
  className,
  children,
  ...rest
}: ButtonProps) => {
  const cls = `${styles.btn} ${styles[variant]} ${styles[size]} ${className ?? ""}`;

  if (asChild && React.isValidElement<{ className?: string }>(children)) {
    return React.cloneElement(children, {
      className: `${cls} ${children.props.className ?? ""}`,
    });
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
};
