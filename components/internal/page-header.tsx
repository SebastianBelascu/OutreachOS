import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b bg-background px-6 py-4 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 truncate text-xl font-semibold text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
