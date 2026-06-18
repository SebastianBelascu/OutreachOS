"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteLeadAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteLeadButtonProps {
  leadId: string;
  leadLabel: string;
  enrollmentCount?: number;
  /** When set, navigate here after a successful delete (used on the lead detail page). */
  redirectTo?: string;
  /** "icon" for the table row, "button" for a labelled action. */
  variant?: "icon" | "button";
}

export function DeleteLeadButton({
  leadId,
  leadLabel,
  enrollmentCount = 0,
  redirectTo,
  variant = "icon",
}: DeleteLeadButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    const formData = new FormData();
    formData.set("leadId", leadId);
    startTransition(async () => {
      const result = await deleteLeadAction(formData);
      if (result.ok) {
        toast.success("Lead șters", { description: leadLabel });
        setOpen(false);
        if (redirectTo) {
          router.push(redirectTo);
        }
      } else {
        toast.error("Nu s-a putut șterge", { description: result.message });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Șterge lead"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="size-4" />
            Șterge lead
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ștergi lead-ul?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{leadLabel}</span> va fi șters definitiv, împreună cu notițele,
            tag-urile
            {enrollmentCount > 0
              ? ` și înrolările din ${enrollmentCount} ${enrollmentCount === 1 ? "campanie" : "campanii"}`
              : ""}
            . Acțiunea nu poate fi anulată.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Anulează
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? "Se șterge..." : "Șterge definitiv"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
