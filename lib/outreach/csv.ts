import { LeadStatus } from "@prisma/client";

import type { LeadImportPreviewRow, LeadImportSummary } from "@/lib/outreach/types";
import { normalizeEmail, splitCommaValues } from "@/lib/outreach/format";

const KNOWN_COLUMNS = new Set([
  "first_name",
  "last_name",
  "email",
  "company",
  "website",
  "industry",
  "country",
  "linkedin_url",
  "status",
  "tags",
]);

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function parseCsvText(csvText: string) {
  return csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
}

function parseStatus(value?: string) {
  const normalized = value?.trim().toUpperCase();
  return (LeadStatus[normalized as keyof typeof LeadStatus] ?? "NEW") as LeadStatus;
}

export function previewLeadImport(
  csvText: string,
  defaultTags: string[] = [],
): LeadImportSummary {
  const rows = parseCsvText(csvText);
  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      duplicateRows: 0,
      importedRows: 0,
      updatedRows: 0,
      invalidRows: 0,
      errors: ["CSV payload is empty."],
      columns: [],
      preview: [],
    };
  }

  const [headerRow, ...dataRows] = rows;
  const columns = headerRow.map((column) => column.toLowerCase());
  const errors: string[] = [];
  const preview: LeadImportPreviewRow[] = [];
  const seen = new Set<string>();
  let duplicateRows = 0;
  let invalidRows = 0;

  dataRows.forEach((row, index) => {
    const cells = Object.fromEntries(columns.map((column, cellIndex) => [column, row[cellIndex] ?? ""]));
    const email = normalizeEmail(cells.email ?? "");

    if (!email) {
      invalidRows += 1;
      errors.push(`Row ${index + 2}: missing email.`);
      return;
    }

    if (seen.has(email)) {
      duplicateRows += 1;
      return;
    }

    seen.add(email);

    const customFields = Object.fromEntries(
      Object.entries(cells).filter(([key, value]) => !KNOWN_COLUMNS.has(key) && value.length > 0),
    );

    preview.push({
      rowNumber: index + 2,
      firstName: cells.first_name || undefined,
      lastName: cells.last_name || undefined,
      email,
      company: cells.company || undefined,
      website: cells.website || undefined,
      industry: cells.industry || undefined,
      country: cells.country || undefined,
      linkedinUrl: cells.linkedin_url || undefined,
      status: parseStatus(cells.status),
      tags: [...new Set([...splitCommaValues(cells.tags ?? ""), ...defaultTags])],
      customFields,
      dedupeKey: email,
    });
  });

  return {
    totalRows: dataRows.length,
    validRows: preview.length,
    duplicateRows,
    importedRows: 0,
    updatedRows: 0,
    invalidRows,
    errors,
    columns,
    preview,
  };
}
