import { Plus } from "lucide-react";

import { createSendingDomainAction } from "@/app/(workspace)/actions";
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
import { Textarea } from "@/components/ui/textarea";

export function CreateSendingDomainDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add domain
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add sending domain</DialogTitle>
          <DialogDescription>Track DNS auth and inbox readiness before campaigns send.</DialogDescription>
        </DialogHeader>
        <form action={createSendingDomainAction} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="domain">Domain</Label>
            <Input id="domain" name="domain" placeholder="outreach-example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider">Registrar/DNS provider</Label>
            <Input id="provider" name="provider" placeholder="Cloudflare, Namecheap..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hostLabel">Inbox host</Label>
            <Input id="hostLabel" name="hostLabel" placeholder="cPanel, Zoho, Google..." />
          </div>
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Select name="purpose" defaultValue="OUTREACH">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OUTREACH">Outreach</SelectItem>
                <SelectItem value="BRAND">Brand</SelectItem>
                <SelectItem value="INTERNAL">Internal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select name="status" defaultValue="NEEDS_SETUP">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEEDS_SETUP">Needs setup</SelectItem>
                <SelectItem value="AUTHENTICATING">Authenticating</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="RISK">Risk</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm md:col-span-2">
            <Checkbox name="isPrimary" />
            This is the main brand domain
          </Label>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" placeholder="DNS owner, warmup notes, provider caveats..." />
          </div>
          <DialogFooter className="md:col-span-2">
            <Button type="submit">Save domain</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
