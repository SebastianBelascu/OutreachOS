import type { ReactNode } from "react";

interface FieldGroupProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function FieldGroup({ title, description, children }: FieldGroupProps) {
  return (
    <fieldset className="space-y-3">
      <div>
        <legend className="text-sm font-medium text-foreground">{title}</legend>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}
