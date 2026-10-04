import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-prose text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "primary";
}) {
  return (
    <div className={cn("card p-5", tone === "primary" && "border-transparent bg-primary text-primary-foreground")}>
      <div className="flex items-center justify-between">
        <p className={cn("text-sm", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {label}
        </p>
        <Icon size={18} className={tone === "primary" ? "text-primary-foreground/80" : "text-primary"} />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && (
        <p className={cn("mt-1 text-xs", tone === "primary" ? "text-primary-foreground/75" : "text-muted-foreground")}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-accent text-accent-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card", className)}>
      {title && (
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] divide-y divide-border">{children}</table>
    </div>
  );
}

export function HoursChart({ data }: { data: { label: string; hours: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.hours));
  return (
    <div className="flex h-40 items-end gap-3 px-5 pb-5 pt-6" role="img" aria-label="Hours worked per day, last 7 days">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">{d.hours > 0 ? d.hours.toFixed(1) : ""}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-primary/85"
              style={{ height: `${Math.max(d.hours > 0 ? 6 : 2, (d.hours / max) * 100)}%`, opacity: d.hours > 0 ? 1 : 0.25 }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
