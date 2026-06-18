"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ToastFormProps {
  /** A server action (or any async fn) taking the submitted FormData. */
  action: (formData: FormData) => Promise<unknown> | unknown;
  /** Success toast title. Pass "" to suppress the success toast. */
  success?: string;
  /** Optional success description shown under the title. */
  successDescription?: string;
  /** Called after the action resolves successfully — e.g. to close a dialog. */
  onSuccess?: () => void;
  className?: string;
  children: ReactNode;
}

/**
 * Drop-in replacement for `<form action={serverAction}>` that always tells the user
 * what happened: a success toast (and optional onSuccess, e.g. closing a dialog) when
 * the action resolves, an error toast when it throws. The action is awaited directly so
 * <FormSubmitButton> sees the real pending state via useFormStatus.
 */
export function ToastForm({
  action,
  success,
  successDescription,
  onSuccess,
  className,
  children,
}: ToastFormProps) {
  return (
    <form
      className={className}
      action={async (formData) => {
        try {
          await action(formData);
          if (success !== "") {
            toast.success(success ?? "Gata", successDescription ? { description: successDescription } : undefined);
          }
          onSuccess?.();
        } catch (error) {
          toast.error(error instanceof Error && error.message ? error.message : "A apărut o eroare.");
        }
      }}
    >
      {children}
    </form>
  );
}

interface FormSubmitButtonProps extends ComponentProps<typeof Button> {
  pendingLabel?: string;
}

/** Submit button that disables and swaps its label while the surrounding form action runs. */
export function FormSubmitButton({ children, pendingLabel, disabled, ...props }: FormSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
