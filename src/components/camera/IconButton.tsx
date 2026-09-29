import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  label?: string;
  children: ReactNode;
};

export function IconButton({ active, label, className, children, ...props }: Props) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex size-11 shrink-0 items-center justify-center rounded-full",
        "text-fg/90 bg-transparent",
        "transition-[background-color,color,scale,opacity] duration-150 ease-out",
        "active:not-disabled:scale-[0.96]",
        "hover:bg-fg/8",
        active && "bg-fg/12 text-fg",
        "disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
      {label ? (
        <span className="sr-only">{label}</span>
      ) : null}
    </button>
  );
}
