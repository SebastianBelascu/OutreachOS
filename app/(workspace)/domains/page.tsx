import { connection } from "next/server";
import { Globe2, ShieldCheck, TriangleAlert } from "lucide-react";

import { CreateSendingDomainDialog } from "@/components/internal/create-sending-domain-dialog";
import { DataToolbar } from "@/components/internal/data-toolbar";
import { DomainSetupChecklist } from "@/components/internal/domain-setup-checklist";
import { EmptyState } from "@/components/internal/empty-state";
import { StatusBadge } from "@/components/internal/status-badge";
import { DomainHealthMap } from "@/components/internal/visual-charts";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDomainReadiness } from "@/lib/outreach/analytics";
import { listSendingDomains } from "@/lib/outreach/mailboxes";

export default async function DomainsPage() {
  await connection();
  const [domains, domainReadiness] = await Promise.all([listSendingDomains(), getDomainReadiness()]);
  const readyDomains = domains.filter((domain) => domain.status === "READY").length;
  const blockedDomains = domains.length - readyDomains;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <DataToolbar actions={<CreateSendingDomainDialog />}>
          <div>
            <p className="text-sm font-medium">Sending domains</p>
            <p className="text-xs text-muted-foreground">Domeniile sunt fundatia. Daca nu sunt READY, inboxurile lor nu ar trebui sa trimita.</p>
          </div>
        </DataToolbar>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-lg">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 size-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Ready domains</p>
              <p className="mt-1 text-2xl font-semibold">{readyDomains}</p>
              <p className="text-xs text-muted-foreground">Pot sustine inboxuri in rotation.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="flex items-start gap-3 p-4">
            <TriangleAlert className="mt-0.5 size-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium">Blocked / setup</p>
              <p className="mt-1 text-2xl font-semibold">{blockedDomains}</p>
              <p className="text-xs text-muted-foreground">Au nevoie de DNS/Brevo/auth review.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Pe limba noastra</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              READY inseamna ca domeniul e ok pentru sending. NEEDS SETUP inseamna ca inca nu ne bazam pe el.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardContent className="p-4">
          <DomainHealthMap data={domainReadiness} />
        </CardContent>
      </Card>

      {domains.length === 0 ? (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={Globe2}
            title="No outreach domains yet"
            description="Add the domains you bought before wiring inboxes and campaign pools."
            action={<CreateSendingDomainDialog />}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Inbox host</TableHead>
                <TableHead>Mailboxes</TableHead>
                <TableHead>Checklist</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell>
                    <p className="font-medium">{domain.domain}</p>
                    <p className="text-xs text-muted-foreground">{domain.notes ?? "Dedicated outreach identity"}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={domain.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={domain.purpose} />
                  </TableCell>
                  <TableCell>{domain.provider ?? "-"}</TableCell>
                  <TableCell>{domain.hostLabel ?? "-"}</TableCell>
                  <TableCell>{domain.mailboxes.length}</TableCell>
                  <TableCell className="min-w-[280px]">
                    <DomainSetupChecklist
                      domainId={domain.id}
                      purpose={domain.purpose}
                      isPrimary={domain.isPrimary}
                      dnsChecklist={domain.dnsChecklist}
                      lastVerifiedAt={domain.lastVerifiedAt}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
