import dnsPromises from "node:dns/promises";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface DnsCheck {
  pass: boolean;
  found: string | null;
  checkedAt: string;
}

export interface DkimCheck extends DnsCheck {
  selector: string | null;
}

export interface DomainDnsChecklist {
  spf: DnsCheck;
  dkim: DkimCheck;
  dmarc: DnsCheck;
  mx: DnsCheck;
  allPass: boolean;
}

/**
 * Minimal resolver surface so tests can inject fakes without real DNS lookups.
 */
export interface DnsResolver {
  resolveTxt(hostname: string): Promise<string[][]>;
  resolveMx(hostname: string): Promise<Array<{ exchange: string; priority: number }>>;
  resolveCname(hostname: string): Promise<string[]>;
}

const defaultResolver: DnsResolver = {
  resolveTxt: (hostname) => dnsPromises.resolveTxt(hostname),
  resolveMx: (hostname) => dnsPromises.resolveMx(hostname),
  resolveCname: (hostname) => dnsPromises.resolveCname(hostname),
};

async function safeTxt(resolver: DnsResolver, hostname: string) {
  try {
    const records = await resolver.resolveTxt(hostname);
    return records.map((parts) => parts.join(""));
  } catch {
    return [] as string[];
  }
}

async function safeCname(resolver: DnsResolver, hostname: string) {
  try {
    return await resolver.resolveCname(hostname);
  } catch {
    return [] as string[];
  }
}

async function safeMx(resolver: DnsResolver, hostname: string) {
  try {
    return await resolver.resolveMx(hostname);
  } catch {
    return [] as Array<{ exchange: string; priority: number }>;
  }
}

export async function evaluateDomainDns(
  domain: string,
  options: { selector?: string; resolver?: DnsResolver; now?: Date } = {},
): Promise<DomainDnsChecklist> {
  const resolver = options.resolver ?? defaultResolver;
  const selector = options.selector?.trim() || "mail";
  const checkedAt = (options.now ?? new Date()).toISOString();

  // SPF — any valid v=spf1 TXT record on the apex. Works for Brevo, cPanel/host SMTP,
  // Google Workspace, etc. (the record must authorize whoever actually sends).
  const txtRecords = await safeTxt(resolver, domain);
  const spfRecord = txtRecords.find((record) => record.toLowerCase().startsWith("v=spf1")) ?? null;
  const spfPass = Boolean(spfRecord);

  // DKIM — try the configured selector plus the common ones (cPanel: "default",
  // Brevo: "mail", Google: "google"); fall back to Brevo's CNAME flow (brevo1/brevo2).
  const txtSelectors = [...new Set([selector, "default", "mail", "google"])];
  let dkimRecord: string | null = null;
  let dkimSelectorUsed: string | null = null;

  for (const candidate of txtSelectors) {
    const dkimTxt = await safeTxt(resolver, `${candidate}._domainkey.${domain}`);
    const match = dkimTxt.find((record) => record.toLowerCase().includes("v=dkim1")) ?? null;
    if (match) {
      dkimRecord = match;
      dkimSelectorUsed = candidate;
      break;
    }
  }

  if (!dkimRecord) {
    for (const cnameSelector of ["brevo1", "brevo2"]) {
      const cname = await safeCname(resolver, `${cnameSelector}._domainkey.${domain}`);
      if (cname.length > 0) {
        dkimRecord = cname[0];
        dkimSelectorUsed = cnameSelector;
        break;
      }
    }
  }

  // DMARC — TXT on _dmarc starting with v=DMARC1.
  const dmarcTxt = await safeTxt(resolver, `_dmarc.${domain}`);
  const dmarcRecord = dmarcTxt.find((record) => record.toLowerCase().startsWith("v=dmarc1")) ?? null;

  // MX — at least one exchanger.
  const mxRecords = await safeMx(resolver, domain);
  const mxFound = mxRecords.length > 0 ? mxRecords.map((mx) => mx.exchange).join(", ") : null;

  const spf: DnsCheck = { pass: spfPass, found: spfRecord, checkedAt };
  const dkim: DkimCheck = { pass: Boolean(dkimRecord), found: dkimRecord, selector: dkimSelectorUsed, checkedAt };
  const dmarc: DnsCheck = { pass: Boolean(dmarcRecord), found: dmarcRecord, checkedAt };
  const mx: DnsCheck = { pass: mxRecords.length > 0, found: mxFound, checkedAt };

  return {
    spf,
    dkim,
    dmarc,
    mx,
    allPass: spf.pass && dkim.pass && dmarc.pass && mx.pass,
  };
}

/**
 * Verifies one domain's DNS, persists the checklist, and promotes/demotes its status.
 */
export async function verifySendingDomain(domainId: string, resolver?: DnsResolver) {
  const domain = await prisma.sendingDomain.findUnique({ where: { id: domainId } });
  if (!domain) {
    return null;
  }

  const checklist = await evaluateDomainDns(domain.domain, {
    selector: domain.dkimSelector ?? "mail",
    resolver,
  });

  let nextStatus = domain.status;
  if (checklist.allPass) {
    if (["NEEDS_SETUP", "AUTHENTICATING", "RISK"].includes(domain.status)) {
      nextStatus = "READY";
    }
  } else if (domain.status === "READY") {
    nextStatus = "RISK";
  } else if (domain.status === "NEEDS_SETUP") {
    nextStatus = "AUTHENTICATING";
  }

  return prisma.sendingDomain.update({
    where: { id: domainId },
    data: {
      dnsChecklist: checklist as unknown as Prisma.InputJsonValue,
      dkimSelector: checklist.dkim.selector ?? domain.dkimSelector,
      lastVerifiedAt: new Date(),
      status: nextStatus,
    },
  });
}

export async function verifyAllSendingDomains() {
  const run = await prisma.cronJobRun.create({ data: { jobName: "outreach-dns" } });
  const domains = await prisma.sendingDomain.findMany({ select: { id: true } });

  let verified = 0;
  let ready = 0;
  let risk = 0;

  for (const domain of domains) {
    const updated = await verifySendingDomain(domain.id);
    if (updated) {
      verified += 1;
      if (updated.status === "READY") ready += 1;
      if (updated.status === "RISK") risk += 1;
    }
  }

  const summary = { verified, ready, risk };
  await prisma.cronJobRun.update({
    where: { id: run.id },
    data: {
      status: "SUCCEEDED",
      finishedAt: new Date(),
      summary: summary as unknown as Prisma.InputJsonValue,
    },
  });

  return summary;
}
