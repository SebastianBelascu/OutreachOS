"use client";

import { useState, useTransition } from "react";
import { FlaskConical, Send } from "lucide-react";
import { toast } from "sonner";

import { sendTestEmailAction } from "@/app/(workspace)/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TestEmailDialogProps {
  mailboxes: { id: string; fromEmail: string }[];
  defaultTo?: string;
}

export function TestEmailDialog({ mailboxes, defaultTo }: TestEmailDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasMailboxes = mailboxes.length > 0;

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await sendTestEmailAction(formData);
      if (result.ok) {
        toast.success("Email de test trimis", { description: result.message });
        setOpen(false);
      } else {
        toast.error("Trimiterea a eșuat", { description: result.message });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FlaskConical className="size-4" />
          Send test email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Trimite un email de test</DialogTitle>
          <DialogDescription>
            Trimite instant un mesaj dintr-o căsuță către orice adresă ca să vezi unde aterizează (Primary / Promotions /
            Spam) — fără să faci o campanie. Folosește exact transportul real al căsuței.
          </DialogDescription>
        </DialogHeader>

        {hasMailboxes ? (
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-mailbox">De la (căsuță)</Label>
              <Select name="mailboxId" defaultValue={mailboxes[0]?.id}>
                <SelectTrigger id="test-mailbox" className="w-full">
                  <SelectValue placeholder="Alege căsuța" />
                </SelectTrigger>
                <SelectContent>
                  {mailboxes.map((mailbox) => (
                    <SelectItem key={mailbox.id} value={mailbox.id}>
                      {mailbox.fromEmail}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-to">Către</Label>
              <Input
                id="test-to"
                name="to"
                type="email"
                required
                defaultValue={defaultTo}
                placeholder="tu@gmail.com"
              />
              <p className="text-xs text-muted-foreground">
                Trimite-l la o adresă de Gmail/Outlook ca să vezi în ce tab aterizează.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-subject">Subiect (opțional)</Label>
              <Input id="test-subject" name="subject" placeholder="Test — OutreachOS" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-body">Mesaj (opțional)</Label>
              <Textarea
                id="test-body"
                name="body"
                placeholder="Lasă gol pentru un mesaj scurt implicit."
                className="min-h-[100px] text-sm"
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={pending}>
                <Send className="size-4" />
                {pending ? "Se trimite..." : "Trimite testul"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nu există nicio căsuță configurată. Adaugă una în Mailboxes ca să poți trimite un test.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
