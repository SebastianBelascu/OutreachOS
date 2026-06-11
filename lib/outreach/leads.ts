import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { previewLeadImport } from "@/lib/outreach/csv";
import { normalizeEmail } from "@/lib/outreach/format";
import type { LeadImportSummary } from "@/lib/outreach/types";
import {
  importRequestSchema,
  leadInputSchema,
  leadNoteInputSchema,
} from "@/lib/outreach/validators";

function normalizeOptional(value?: string) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

async function connectTags(leadId: string, tags: string[]) {
  for (const tagName of tags) {
    const tag = await prisma.leadTag.upsert({
      where: { name: tagName },
      update: {},
      create: {
        name: tagName,
      },
    });

    await prisma.leadTagAssignment.upsert({
      where: {
        leadId_tagId: {
          leadId,
          tagId: tag.id,
        },
      },
      update: {},
      create: {
        leadId,
        tagId: tag.id,
      },
    });
  }
}

export async function createLead(input: unknown, createdById: string) {
  const parsed = leadInputSchema.parse(input);
  const normalizedEmail = normalizeEmail(parsed.email);

  const lead = await prisma.lead.upsert({
    where: { normalizedEmail },
    update: {
      firstName: normalizeOptional(parsed.firstName),
      lastName: normalizeOptional(parsed.lastName),
      email: parsed.email,
      company: normalizeOptional(parsed.company),
      website: normalizeOptional(parsed.website),
      industry: normalizeOptional(parsed.industry),
      country: normalizeOptional(parsed.country),
      linkedinUrl: normalizeOptional(parsed.linkedinUrl),
      status: parsed.status,
      bestOffer: normalizeOptional(parsed.bestOffer),
      priority: parsed.priority ?? null,
      customFields: parsed.customFields as unknown as Prisma.InputJsonValue,
    },
    create: {
      firstName: normalizeOptional(parsed.firstName),
      lastName: normalizeOptional(parsed.lastName),
      email: parsed.email,
      normalizedEmail,
      company: normalizeOptional(parsed.company),
      website: normalizeOptional(parsed.website),
      industry: normalizeOptional(parsed.industry),
      country: normalizeOptional(parsed.country),
      linkedinUrl: normalizeOptional(parsed.linkedinUrl),
      status: parsed.status,
      bestOffer: normalizeOptional(parsed.bestOffer),
      priority: parsed.priority ?? null,
      createdById,
      customFields: parsed.customFields as unknown as Prisma.InputJsonValue,
    },
  });

  await connectTags(lead.id, parsed.tags);

  return lead;
}

export async function setLeadStatus(leadId: string, status: string) {
  return prisma.lead.update({
    where: { id: leadId },
    data: { status: status as never },
  });
}

export async function createLeadNote(input: unknown, authorId: string) {
  const parsed = leadNoteInputSchema.parse(input);
  return prisma.leadNote.create({
    data: {
      leadId: parsed.leadId,
      authorId,
      content: parsed.content,
    },
  });
}

export async function getLeadFilters(
  search?: string,
  status?: string,
  offer?: string,
  priority?: string,
) {
  const where: Prisma.LeadWhereInput = {};

  if (search && search.trim().length > 0) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status && status !== "ALL") {
    where.status = status as never;
  }

  if (offer && offer !== "ALL") {
    where.bestOffer = offer;
  }

  if (priority && priority !== "ALL") {
    where.priority = priority as never;
  }

  return where;
}

export async function listLeads(params?: {
  search?: string;
  status?: string;
  offer?: string;
  priority?: string;
}) {
  return prisma.lead.findMany({
    where: await getLeadFilters(params?.search, params?.status, params?.offer, params?.priority),
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      enrollments: {
        include: {
          campaign: true,
        },
      },
      suppressions: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getLeadById(leadId: string) {
  return prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      notes: {
        include: {
          author: true,
        },
        orderBy: { createdAt: "desc" },
      },
      enrollments: {
        include: {
          campaign: true,
        },
      },
      messages: {
        orderBy: { scheduledAt: "desc" },
        take: 20,
      },
      inboundMessages: {
        where: { direction: "INBOUND" },
        orderBy: { receivedAt: "desc" },
        take: 20,
      },
      suppressions: true,
    },
  });
}

export async function importLeadsFromCsv(
  input: unknown,
  createdById: string,
): Promise<LeadImportSummary & { importJobId: string }> {
  const parsed = importRequestSchema.parse(input);
  const preview = previewLeadImport(parsed.csvText, parsed.defaultTags, parsed.columnMapping);

  const importJob = await prisma.importJob.create({
    data: {
      fileName: parsed.fileName ?? null,
      status: parsed.mode === "preview" ? "PREVIEW" : "PENDING",
      rawColumns: preview.columns,
      totalRows: preview.totalRows,
      summary: preview as unknown as Prisma.InputJsonValue,
      createdById,
    },
  });

  if (parsed.mode === "preview") {
    return {
      ...preview,
      importJobId: importJob.id,
    };
  }

  let importedRows = 0;
  let updatedRows = 0;

  for (const row of preview.preview) {
    const existingLead = await prisma.lead.findUnique({
      where: { normalizedEmail: row.dedupeKey },
    });

    const lead = await prisma.lead.upsert({
      where: { normalizedEmail: row.dedupeKey },
      update: {
        firstName: normalizeOptional(row.firstName),
        lastName: normalizeOptional(row.lastName),
        email: row.email,
        company: normalizeOptional(row.company),
        website: normalizeOptional(row.website),
        industry: normalizeOptional(row.industry),
        country: normalizeOptional(row.country),
        linkedinUrl: normalizeOptional(row.linkedinUrl),
        status: row.status,
        bestOffer: normalizeOptional(row.bestOffer),
        priority: row.priority ?? null,
        customFields: row.customFields as unknown as Prisma.InputJsonValue,
      },
      create: {
        firstName: normalizeOptional(row.firstName),
        lastName: normalizeOptional(row.lastName),
        email: row.email,
        normalizedEmail: row.dedupeKey,
        company: normalizeOptional(row.company),
        website: normalizeOptional(row.website),
        industry: normalizeOptional(row.industry),
        country: normalizeOptional(row.country),
        linkedinUrl: normalizeOptional(row.linkedinUrl),
        status: row.status,
        bestOffer: normalizeOptional(row.bestOffer),
        priority: row.priority ?? null,
        createdById,
        customFields: row.customFields as unknown as Prisma.InputJsonValue,
      },
    });

    await connectTags(lead.id, row.tags);

    if (existingLead) {
      updatedRows += 1;
    } else {
      importedRows += 1;
    }
  }

  const summary = {
    ...preview,
    importedRows,
    updatedRows,
  };

  await prisma.importJob.update({
    where: { id: importJob.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      summary: summary as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    ...summary,
    importJobId: importJob.id,
  };
}
