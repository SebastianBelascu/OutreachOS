"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { sendInboxReplyAction } from "@/app/(workspace)/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Send className="size-4" />
      {pending ? "Sending..." : "Send reply"}
    </Button>
  );
}

interface ReplyComposerProps {
  inboundMessageId: string;
  toEmail: string;
}

export function ReplyComposer({ inboundMessageId, toEmail }: ReplyComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        try {
          await sendInboxReplyAction(formData);
          formRef.current?.reset();
          toast.success("Răspuns trimis");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Nu am putut trimite răspunsul.");
        }
      }}
      className="space-y-2 border-t bg-background p-3"
    >
      <input type="hidden" name="inboundMessageId" value={inboundMessageId} />
      <p className="text-xs text-muted-foreground">Reply to {toEmail}</p>
      <Textarea name="body" required placeholder="Write your reply..." className="min-h-[110px] text-sm" />
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
