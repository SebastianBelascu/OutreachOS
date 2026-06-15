"use client";

import { useState } from "react";
import { FileUp, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface ImportResponse {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  importedRows: number;
  updatedRows: number;
  invalidRows: number;
  skippedRows?: number;
  detectedFormat?: string;
  errors: string[];
  columns: string[];
  mappedColumns?: Record<string, string>;
  preview: Array<{
    rowNumber: number;
    email: string;
    company?: string;
    status: string;
    bestOffer?: string;
    priority?: string;
    tags: string[];
  }>;
}

const BUILT_IN_TARGETS = new Set([
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
  "first_line",
  "observation",
  "entry_offer",
]);

function selectValueForTarget(target: string) {
  if (target.startsWith("custom:") || !BUILT_IN_TARGETS.has(target)) {
    return "custom:auto";
  }

  return target;
}

export function LeadImporter() {
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [tags, setTags] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"preview" | "import">("preview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => setError("Could not read the file.");
    reader.readAsText(file);
  }

  async function submit(nextMode: "preview" | "import") {
    setMode(nextMode);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/leads/import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          csvText,
          fileName: fileName ?? undefined,
          mode: nextMode,
          defaultTags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          columnMapping,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const payload = (await response.json()) as ImportResponse;
      setResult(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Import request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <FileUp className="size-4" />
          Import CSV
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Import leads</SheetTitle>
          <SheetDescription>Paste CSV, preview rows, and map fields before import.</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <Tabs defaultValue="paste" className="space-y-4">
            <TabsList>
              <TabsTrigger value="paste">Paste CSV</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="mapping">Map columns</TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csvFile">Upload .csv file</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFile}
                  className="cursor-pointer file:mr-3 file:cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  {fileName ? `Loaded ${fileName} - run Preview to inspect.` : "Pick a file, or paste below."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultTags">Default tags</Label>
                <Input
                  id="defaultTags"
                  placeholder="cold, saas, q2"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="csvText">CSV payload</Label>
                <Textarea
                  id="csvText"
                  placeholder={"first_name,last_name,email,company,tags\nAna,Pop,ana@example.com,Acme,\"warm,priority\""}
                  value={csvText}
                  onChange={(event) => {
                    setCsvText(event.target.value);
                    setFileName(null);
                  }}
                  className="min-h-[260px] font-mono text-xs"
                />
              </div>
            </TabsContent>
            <TabsContent value="preview" className="space-y-4">
              {result?.detectedFormat === "lead-hub" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  <span className="font-medium">lead-hub export detected.</span> Columns are mapped automatically
                  ({"{{first_line}}"}, {"{{observation}}"}, {"{{entry_offer}}"} become template variables). Competitors and
                  non-validated rows are skipped.
                </div>
              ) : null}
              <div className="grid gap-3 md:grid-cols-5">
                {[
                  ["Rows", result?.totalRows ?? 0],
                  ["Valid", result?.validRows ?? 0],
                  ["Duplicates", result?.duplicateRows ?? 0],
                  ["Invalid", result?.invalidRows ?? 0],
                  ["Skipped", result?.skippedRows ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Offer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(result?.preview ?? []).slice(0, 8).map((row) => (
                      <TableRow key={`${row.rowNumber}-${row.email}`}>
                        <TableCell className="font-medium">{row.email}</TableCell>
                        <TableCell>{row.company ?? "-"}</TableCell>
                        <TableCell className="text-xs">
                          {row.bestOffer ?? "-"}
                          {row.priority ? ` (${row.priority})` : ""}
                        </TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.tags.join(", ") || "-"}</TableCell>
                      </TableRow>
                    ))}
                    {!result ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Run preview to inspect parsed rows.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="mapping" className="space-y-3">
              <div className="rounded-md border bg-muted/25 p-4 text-sm text-muted-foreground">
                Detected columns: {result?.columns.join(", ") || "Run preview first"}
              </div>
              <p className="text-xs text-muted-foreground">
                Map your personalization column to <span className="font-medium">Personalization line</span> so it fills{" "}
                {"{{first_line}}"} in every email (incl. the SDR sequences).
              </p>
              {result?.columns.length ? (
                <div className="space-y-2">
                  {result.columns.map((column) => (
                    <div key={column} className="grid items-center gap-3 rounded-md border p-3 md:grid-cols-[1fr_220px]">
                      <div>
                        <p className="text-sm font-medium">{column}</p>
                        <p className="text-xs text-muted-foreground">
                          Current target: {result.mappedColumns?.[column] ?? column}
                        </p>
                      </div>
                      <Select
                        value={selectValueForTarget(columnMapping[column] ?? result.mappedColumns?.[column] ?? column)}
                        onValueChange={(value) =>
                          setColumnMapping((current) => ({
                            ...current,
                            [column]: value === "custom:auto" ? `custom:${column}` : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="first_name">First name</SelectItem>
                          <SelectItem value="last_name">Last name</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="company">Company</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="industry">Industry</SelectItem>
                          <SelectItem value="country">Country</SelectItem>
                          <SelectItem value="linkedin_url">LinkedIn URL</SelectItem>
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="tags">Tags</SelectItem>
                          <SelectItem value="first_line">{"Personalization line → {{first_line}}"}</SelectItem>
                          <SelectItem value="observation">{"Observation → {{observation}}"}</SelectItem>
                          <SelectItem value="entry_offer">{"Entry offer → {{entry_offer}}"}</SelectItem>
                          <SelectItem value="custom:auto">Custom variable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              ) : null}
              {result?.errors.length ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {result.errors.map((entry) => (
                    <p key={entry}>{entry}</p>
                  ))}
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </div>
        <SheetFooter className="border-t">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={loading} onClick={() => submit("preview")}>
              {loading && mode === "preview" ? "Previewing..." : "Preview"}
            </Button>
            <Button type="button" disabled={loading || !result} onClick={() => submit("import")}>
              <Upload className="size-4" />
              {loading && mode === "import" ? "Importing..." : "Import valid rows"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
