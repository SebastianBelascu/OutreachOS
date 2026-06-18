import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { generateFirstLine } from "@/lib/outreach/ai";
import { previewLeadImport } from "@/lib/outreach/csv";
import { normalizeEmail } from "@/lib/outreach/format";
import type { LeadImportPreviewRow, LeadImportSummary } from "@/lib/outreach/types";
import {
  importRequestSchema,
  leadInputSchema,
  leadNoteInputSchema,
} from "@/lib/outreach/validators";

function normalizeOptional(value?: string) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

/** Shared column mapping for both the create and update sides of a lead upsert. */
function leadWriteData(row: LeadImportPreviewRow) {
  return {
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
  };
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

/**
 * Permanently removes a lead. Tags, notes, enrollments, outbound messages and
 * suppressions cascade away via their FK rules; email/inbound events keep their
 * history with the leadId nulled out (onDelete: SetNull).
 */
export async function deleteLead(leadId: string) {
  return prisma.lead.delete({ where: { id: leadId } });
}

/** Bulk-deletes leads by id. Same cascade rules as deleteLead. Returns the count removed. */
export async function deleteLeads(leadIds: string[]) {
  const ids = [...new Set(leadIds.filter(Boolean))];
  if (ids.length === 0) {
    return { count: 0 };
  }
  return prisma.lead.deleteMany({ where: { id: { in: ids } } });
}

function asCustomFields(value: Prisma.JsonValue | null): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function readFirstLine(customFields: Prisma.JsonValue | null): string | null {
  const value = asCustomFields(customFields).first_line;
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/** Merges a generated personalization line into the lead's customFields.first_line. */
export async function setLeadFirstLine(leadId: string, firstLine: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { customFields: true } });
  if (!lead) {
    throw new Error("Lead not found.");
  }
  const customFields = { ...asCustomFields(lead.customFields), first_line: firstLine };
  return prisma.lead.update({
    where: { id: leadId },
    data: { customFields: customFields as unknown as Prisma.InputJsonValue },
  });
}

/** Generates and stores {{first_line}} for one lead. Returns whether a line was produced. */
export async function generateLeadFirstLine(leadId: string) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    throw new Error("Lead not found.");
  }
  const line = await generateFirstLine(lead);
  if (!line) {
    return { leadId, generated: false as const };
  }
  await setLeadFirstLine(leadId, line);
  return { leadId, generated: true as const, firstLine: line };
}

/**
 * Generates {{first_line}} for up to `limit` leads that don't have one yet, skipping
 * suppressed leads. Runs sequentially to stay well under OpenAI rate limits.
 */
export async function generateMissingFirstLines(limit = 50) {
  const leads = await prisma.lead.findMany({
    where: { suppressions: { none: {} } },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  const targets = leads.filter((lead) => !readFirstLine(lead.customFields)).slice(0, Math.max(1, limit));

  let generated = 0;
  for (const lead of targets) {
    const line = await generateFirstLine(lead);
    if (line) {
      await setLeadFirstLine(lead.id, line);
      generated += 1;
    }
  }

  return { attempted: targets.length, generated };
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

  const rows = preview.preview;
  let importedRows = 0;
  let updatedRows = 0;

  try {
    // Which leads already exist? One read instead of a findUnique per row.
    const existing = await prisma.lead.findMany({
      where: { normalizedEmail: { in: rows.map((row) => row.dedupeKey) } },
      select: { normalizedEmail: true },
    });
    const existingKeys = new Set(existing.map((lead) => lead.normalizedEmail));

    // Create every distinct tag once and resolve their ids in a single read.
    // The old path upserted each tag + assignment per row, so a 120-row import
    // fired ~960 sequential queries and blew the serverless time budget,
    // dying mid-loop (the ImportJob stayed PENDING with a partial DB write).
    const uniqueTags = [...new Set(rows.flatMap((row) => row.tags))];
    if (uniqueTags.length > 0) {
      await prisma.leadTag.createMany({
        data: uniqueTags.map((name) => ({ name })),
        skipDuplicates: true,
      });
    }
    const tagRecords = uniqueTags.length
      ? await prisma.leadTag.findMany({
          where: { name: { in: uniqueTags } },
          select: { id: true, name: true },
        })
      : [];
    const tagIdByName = new Map(tagRecords.map((tag) => [tag.name, tag.id]));

    // Upsert leads in small concurrent batches: low wall-clock without
    // exhausting the connection pool. Tag links are collected for one bulk write.
    const CHUNK = 10;
    const assignments: { leadId: string; tagId: string }[] = [];

    for (let start = 0; start < rows.length; start += CHUNK) {
      const chunk = rows.slice(start, start + CHUNK);
      const upserted = await Promise.all(
        chunk.map((row) =>
          prisma.lead.upsert({
            where: { normalizedEmail: row.dedupeKey },
            update: leadWriteData(row),
            create: { ...leadWriteData(row), normalizedEmail: row.dedupeKey, createdById },
          }),
        ),
      );

      upserted.forEach((lead, index) => {
        const row = chunk[index];
        if (existingKeys.has(row.dedupeKey)) {
          updatedRows += 1;
        } else {
          importedRows += 1;
        }
        for (const tagName of row.tags) {
          const tagId = tagIdByName.get(tagName);
          if (tagId) {
            assignments.push({ leadId: lead.id, tagId });
          }
        }
      });
    }

    if (assignments.length > 0) {
      await prisma.leadTagAssignment.createMany({ data: assignments, skipDuplicates: true });
    }
  } catch (error) {
    // Record the partial outcome instead of leaving the job stuck on PENDING.
    await prisma.importJob.update({
      where: { id: importJob.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        summary: {
          ...preview,
          importedRows,
          updatedRows,
          errors: [...preview.errors, error instanceof Error ? error.message : "Import failed."],
        } as unknown as Prisma.InputJsonValue,
      },
    });
    throw error;
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
