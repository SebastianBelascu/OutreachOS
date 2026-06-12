import type { SendingDomain } from "@prisma/client";
import { Info, Plus } from "lucide-react";

import { createMailboxAction } from "@/app/(workspace)/actions";
import { SendWindowPicker } from "@/components/internal/send-window-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface CreateMailboxDialogProps {
  domains?: SendingDomain[];
}

function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function CreateMailboxDialog({ domains = [] }: CreateMailboxDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add mailbox
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Add mailbox</DialogTitle>
          <DialogDescription>
            Add the email address we will send from. Most settings already have safe defaults.
          </DialogDescription>
        </DialogHeader>
        <form action={createMailboxAction} className="flex min-h-0 flex-col">
          <div className="max-h-[calc(88vh-150px)] space-y-4 overflow-y-auto px-6 py-5">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
              <div className="flex gap-2">
                <Info className="mt-0.5 size-4 shrink-0" />
                <p>
                  Pe scurt: aici bagi inboxul real, gen <strong>andrei@domeniu.ro</strong>.
                  Trimitem prin SMTP-ul acestui inbox, iar reply-urile vin pe aceeasi adresa.
                </p>
              </div>
            </div>

            <Section
              title="1. Inbox basics"
              description="Astea sunt singurele lucruri obligatorii: domeniul, adresa de email si numele afisat."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Sending domain</Label>
                  <Select name="domainId" defaultValue={domains[0]?.id}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.id}>
                          {domain.domain} - {domain.status.replaceAll("_", " ").toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <HelpText>Domeniul cumparat pentru outreach. Ideal separat de domeniul principal.</HelpText>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mailboxName">Internal label</Label>
                  <Input id="mailboxName" name="name" placeholder="Andrei - domain 1" required />
                  <HelpText>Nume doar pentru noi in platforma.</HelpText>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">Inbox email</Label>
                  <Input id="fromEmail" name="fromEmail" type="email" placeholder="andrei@domain.com" required />
                  <HelpText>Adresa care apare ca expeditor.</HelpText>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromName">From name</Label>
                  <Input id="fromName" name="fromName" placeholder="Andrei Pop" required />
                  <HelpText>Numele vazut de lead in inbox.</HelpText>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="replyTo">Reply-to</Label>
                  <Input id="replyTo" name="replyTo" type="email" placeholder="leave empty = same inbox" />
                  <HelpText>Lasa gol daca vrei reply pe aceeasi adresa.</HelpText>
                </div>
              </div>
            </Section>

            <Section
              title="2. Safe sending limits"
              description="Defaulturile sunt intentionat conservatoare. Pentru inbox nou, trimitem incet si crestem treptat."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="dailyCap">Daily cap</Label>
                  <Input id="dailyCap" name="dailyCap" type="number" defaultValue="30" min="1" />
                  <HelpText>Maxim pe zi pentru inbox.</HelpText>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rampStart">Start/day</Label>
                  <Input id="rampStart" name="rampStart" type="number" defaultValue="5" min="1" />
                  <HelpText>Primele zile: cate mailuri/zi.</HelpText>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rampIncrement">Grow/day</Label>
                  <Input id="rampIncrement" name="rampIncrement" type="number" defaultValue="5" min="0" />
                  <HelpText>Cu cat creste zilnic.</HelpText>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyCap">Hourly cap</Label>
                  <Input id="hourlyCap" name="hourlyCap" type="number" defaultValue="8" min="1" />
                  <HelpText>Maxim pe ora, ca sa nu trimitem in rafale.</HelpText>
                </div>
                <input type="hidden" name="maxDailyCap" value="50" />
                <input type="hidden" name="rotationWeight" value="1" />
              </div>
              <SendWindowPicker />
            </Section>

            <Section
              title="3. Status"
              description="Pana nu verifici domeniul, SMTP-ul si inboxul, lasa senderul Unverified. Il faci Healthy cand e gata de trimitere."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Health</Label>
                  <Select name="healthStatus" defaultValue="UNVERIFIED">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNVERIFIED">Unverified - not ready yet</SelectItem>
                      <SelectItem value="HEALTHY">Healthy - ready to send</SelectItem>
                      <SelectItem value="WARNING">Warning - send carefully</SelectItem>
                      <SelectItem value="UNHEALTHY">Unhealthy - block sending</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Warmup state</Label>
                  <Select name="warmupState" defaultValue="COLD">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COLD">Cold - new inbox</SelectItem>
                      <SelectItem value="WARMING">Warming - ramping volume</SelectItem>
                      <SelectItem value="ACTIVE">Active - stable sender</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm md:col-span-2">
                  <Checkbox name="isActive" defaultChecked />
                  Active sender
                </Label>
              </div>
            </Section>

            <Section
              title="4. Trimitere (transport)"
              description="Default: SMTP direct prin inboxul real (Gmail/Workspace cu app password, host generic, sau relay Brevo daca alegi asta). Parola e criptata."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Transport</Label>
                  <Select name="sendTransport" defaultValue="SMTP">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SMTP">SMTP direct (default)</SelectItem>
                      <SelectItem value="BREVO">Brevo API (optional)</SelectItem>
                    </SelectContent>
                  </Select>
                  <HelpText>Pentru SMTP completeaza host/user/parola mai jos. Brevo API ramane optiune daca vrei tracking prin webhook.</HelpText>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP host</Label>
                  <Input id="smtpHost" name="smtpHost" placeholder="smtp.gmail.com / smtp-relay.brevo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP port</Label>
                  <Input id="smtpPort" name="smtpPort" type="number" defaultValue="587" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUsername">SMTP username</Label>
                  <Input id="smtpUsername" name="smtpUsername" placeholder="full email / SMTP login" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPassword">SMTP password</Label>
                  <Input id="smtpPassword" name="smtpPassword" type="password" autoComplete="new-password" />
                </div>
                <Label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm md:col-span-2">
                  <Checkbox name="smtpSecure" />
                  SSL/TLS direct (port 465). Lasa gol pentru 587 (STARTTLS).
                </Label>
              </div>
            </Section>

            <details className="rounded-lg border bg-muted/10 p-4">
              <summary className="cursor-pointer text-sm font-semibold">Advanced settings, de obicei nu trebuie atinse</summary>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select name="provider" defaultValue="EMAIL_HOST">
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL_HOST">Email host</SelectItem>
                      <SelectItem value="GOOGLE_WORKSPACE">Google Workspace</SelectItem>
                      <SelectItem value="MICROSOFT_365">Microsoft 365</SelectItem>
                      <SelectItem value="BREVO_HOSTED">Brevo + inbox host</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mailboxTimezone">Timezone</Label>
                  <Input id="mailboxTimezone" name="timezone" defaultValue="Europe/Bucharest" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <p className="text-xs font-medium text-foreground">IMAP — pentru Unibox & detectarea raspunsurilor</p>
                  <HelpText>
                    Completeaza ca sa citim inboxul si sa oprim automat secventa cand cineva raspunde.
                    Pentru Brevo optional: host <strong>imap.brevo.com</strong>, port 993, user = adresa completa.
                    Parola e criptata si nu mai apare niciodata in platforma.
                  </HelpText>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapHost">IMAP host</Label>
                  <Input id="imapHost" name="imapHost" placeholder="imap.brevo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPort">IMAP port</Label>
                  <Input id="imapPort" name="imapPort" type="number" defaultValue="993" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapUsername">IMAP username</Label>
                  <Input id="imapUsername" name="imapUsername" placeholder="same as inbox email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPassword">IMAP password</Label>
                  <Input id="imapPassword" name="imapPassword" type="password" autoComplete="new-password" />
                </div>
                <input type="hidden" name="hostLabel" value="" />
                <input type="hidden" name="localPart" value="" />
                <input type="hidden" name="connectionStatus" value="NOT_CONFIGURED" />
              </div>
            </details>
          </div>

          <DialogFooter className="border-t bg-background px-6 py-4">
            <Button type="submit">Save mailbox</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
