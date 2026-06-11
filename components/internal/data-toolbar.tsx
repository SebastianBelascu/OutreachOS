import type { ReactNode } from "react";

interface DataToolbarProps {
  children: ReactNode;
  actions?: ReactNode;
}

export function DataToolbar({ children, actions }: DataToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b bg-muted/25 p-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">{children}</div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
