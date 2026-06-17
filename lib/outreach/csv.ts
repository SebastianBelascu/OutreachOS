import { LeadStatus, type LeadPriority } from "@prisma/client";

import type { LeadImportPreviewRow, LeadImportSummary } from "@/lib/outreach/types";
import { normalizeEmail, slugify, splitCommaValues } from "@/lib/outreach/format";

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

// lead-hub export columns whose values become template variables / context on the lead.
const LEADHUB_CUSTOM_FIELDS = [
  "first_line",
  "observation",
  "entry_offer",
  "outreach_angle",
  "problem_seen",
  "target_persona",
  "icp_fit",
  "score",
  "company_size_guess",
  "seo_signals",
  "followup_signals",
  "conversion_signals",
  "workflow_signals",
  "sdr_signals",
  "phone",
  "address",
  "location",
  "mapsurl",
] as const;

/**
 * Stateful, quote-aware CSV parser. Unlike a naive line-split, it keeps quoted
 * fields that contain embedded newlines intact — required for lead-hub exports
 * where `first_line` / `observation` cells span multiple lines.
 */
function parseCsv(csvText: string): string[][] {
  const text = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      inQuotes = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows
    .map((cells) => cells.map((cell) => cell.trim()))
    .filter((cells) => cells.some((cell) => cell.length > 0));
}

function normalizeColumn(column: string) {
  return column.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeMappedColumn(column: string, mapping: Record<string, string>) {
  const normalized = normalizeColumn(column);
  return mapping[normalized] || mapping[column] || normalized;
}

function parseStatus(value?: string) {
  const normalized = value?.trim().toUpperCase();
  return (LeadStatus[normalized as keyof typeof LeadStatus] ?? "NEW") as LeadStatus;
}

function parsePriority(value?: string): LeadPriority | undefined {
  const normalized = value?.trim().toUpperCase();
  return normalized === "A" || normalized === "B" || normalized === "C" ? normalized : undefined;
}

export function isLeadHubExport(columns: string[]) {
  const set = new Set(columns);
  return set.has("offer_angle") && set.has("first_line") && set.has("validation_status");
}

function emptyToUndefined(value?: string) {
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function buildLeadHubRow(
  cells: Record<string, string>,
  rowNumber: number,
  email: string,
  defaultTags: string[],
): LeadImportPreviewRow {
  const domain = emptyToUndefined(cells.domain);
  const website =
    emptyToUndefined(cells.website) ?? (domain ? `https://${domain}` : undefined);
  const bestOffer = emptyToUndefined(cells.offer_angle);
  const priority = parsePriority(cells.priority);

  const customFields: Record<string, string> = {};
  for (const key of LEADHUB_CUSTOM_FIELDS) {
    const value = emptyToUndefined(cells[key]);
    if (value) {
      // mapsurl normalized key — expose as maps_url to keep variables snake_cased.
      customFields[key === "mapsurl" ? "maps_url" : key] = value;
    }
  }

  const tags = [...defaultTags, "source:lead-hub"];
  if (bestOffer) {
    tags.push(`offer:${slugify(bestOffer)}`);
  }
  if (priority) {
    tags.push(`priority:${priority}`);
  }

  return {
    rowNumber,
    email,
    company: emptyToUndefined(cells.company_name) ?? emptyToUndefined(cells.name),
    website,
    industry:
      emptyToUndefined(cells.industry) ??
      emptyToUndefined(cells.industry_llm) ??
      emptyToUndefined(cells.category),
    country: emptyToUndefined(cells.country),
    status: "NEW",
    bestOffer,
    priority,
    tags: [...new Set(tags)],
    customFields,
    dedupeKey: email,
  };
}

export function previewLeadImport(
  csvText: string,
  defaultTags: string[] = [],
  columnMapping: Record<string, string> = {},
): LeadImportSummary {
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      duplicateRows: 0,
      importedRows: 0,
      updatedRows: 0,
      invalidRows: 0,
      skippedRows: 0,
      errors: ["CSV payload is empty."],
      columns: [],
      preview: [],
    };
  }

  const [headerRow, ...dataRows] = rows;
  const columns = headerRow.map(normalizeColumn);
  const leadHub = isLeadHubExport(columns);
  const mappedColumns = Object.fromEntries(
    columns.map((column) => [column, normalizeMappedColumn(column, columnMapping)]),
  );
  const errors: string[] = [];
  const preview: LeadImportPreviewRow[] = [];
  const seen = new Set<string>();
  let duplicateRows = 0;
  let invalidRows = 0;
  let skippedRows = 0;
  const skipReasons = { competitor: 0, notValidated: 0, noEmail: 0 };
  const validationStatusesSeen = new Set<string>();

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;

    if (leadHub) {
      const cells = Object.fromEntries(columns.map((column, cellIndex) => [column, row[cellIndex] ?? ""]));

      // Skip competitors and any lead the qualifier did not mark as validated.
      if (cells.is_competitor?.trim().toLowerCase() === "true") {
        skippedRows += 1;
        skipReasons.competitor += 1;
        return;
      }
      if (cells.validation_status && cells.validation_status.trim().toLowerCase() !== "validated") {
        skippedRows += 1;
        skipReasons.notValidated += 1;
        validationStatusesSeen.add(cells.validation_status.trim());
        return;
      }

      // emails is pipe-separated, primary validated address first.
      const email = normalizeEmail((cells.emails ?? "").split("|")[0] ?? "");
      if (!email) {
        skippedRows += 1;
        skipReasons.noEmail += 1;
        return;
      }
      if (seen.has(email)) {
        duplicateRows += 1;
        return;
      }
      seen.add(email);
      preview.push(buildLeadHubRow(cells, rowNumber, email, defaultTags));
      return;
    }

    const cells = Object.fromEntries(
      columns.map((column, cellIndex) => [mappedColumns[column], row[cellIndex] ?? ""]),
    );
    const email = normalizeEmail(cells.email ?? "");

    if (!email) {
      invalidRows += 1;
      errors.push(`Row ${rowNumber}: missing email.`);
      return;
    }

    if (seen.has(email)) {
      duplicateRows += 1;
      return;
    }

    seen.add(email);

    const customFields = Object.fromEntries(
      Object.entries(cells)
        .map(([key, value]) => [key.startsWith("custom:") ? key.replace(/^custom:/, "") : key, value] as const)
        .filter(([key, value]) => !KNOWN_COLUMNS.has(key) && value.length > 0),
    );

    preview.push({
      rowNumber,
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

  // Tell the operator WHY rows were skipped instead of a silent count — and surface the
  // actual validation_status values so a mismatch (e.g. "pending" vs "validated") is obvious.
  if (leadHub && skippedRows > 0) {
    errors.push(
      `Skipped ${skippedRows}: ${skipReasons.notValidated} not validation_status="validated", ` +
        `${skipReasons.noEmail} missing email, ${skipReasons.competitor} competitors.`,
    );
    if (skipReasons.notValidated > 0 && validationStatusesSeen.size > 0) {
      errors.push(
        `validation_status values found (need "validated"): ${[...validationStatusesSeen].slice(0, 8).join(", ")}`,
      );
    }
    if (skipReasons.noEmail > 0) {
      errors.push(`Missing email: check the "emails" column exists and is populated.`);
    }
  }

  return {
    totalRows: dataRows.length,
    validRows: preview.length,
    duplicateRows,
    importedRows: 0,
    updatedRows: 0,
    invalidRows,
    skippedRows,
    detectedFormat: leadHub ? "lead-hub" : "generic",
    errors,
    columns,
    mappedColumns,
    preview,
  };
}
