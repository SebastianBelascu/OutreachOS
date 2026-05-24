"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ImportResponse {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  importedRows: number;
  updatedRows: number;
  invalidRows: number;
  errors: string[];
  columns: string[];
  preview: Array<{
    rowNumber: number;
    email: string;
    company?: string;
    status: string;
    tags: string[];
  }>;
}

export function LeadImporter() {
  const [csvText, setCsvText] = useState("");
  const [tags, setTags] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [mode, setMode] = useState<"preview" | "import">("preview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          mode: nextMode,
          defaultTags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
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
    <Card className="rounded-[24px] border-white/70 bg-white/85 shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
      <CardHeader>
        <CardTitle className="text-lg">CSV import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Default tags: cold, saas, q2"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
        <Textarea
          placeholder={"first_name,last_name,email,company,tags\nAna,Pop,ana@example.com,Acme,\"warm,priority\""}
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          className="min-h-[220px]"
        />
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={loading} onClick={() => submit("preview")}>
            {loading && mode === "preview" ? "Previewing..." : "Preview import"}
          </Button>
          <Button type="button" disabled={loading} onClick={() => submit("import")}>
            {loading && mode === "import" ? "Importing..." : "Run import"}
          </Button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {result ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p>
              Rows: {result.totalRows} total, {result.validRows} valid, {result.duplicateRows} duplicates,
              {` `}{result.invalidRows} invalid.
            </p>
            {mode === "import" ? (
              <p>
                Imported {result.importedRows}, updated {result.updatedRows}.
              </p>
            ) : null}
            {result.preview.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-2">Email</th>
                      <th className="py-2">Company</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview.slice(0, 6).map((row) => (
                      <tr key={`${row.rowNumber}-${row.email}`} className="border-t border-slate-200">
                        <td className="py-2">{row.email}</td>
                        <td className="py-2">{row.company ?? "-"}</td>
                        <td className="py-2">{row.status}</td>
                        <td className="py-2">{row.tags.join(", ") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {result.errors.length > 0 ? (
              <div className="space-y-1 text-red-600">
                {result.errors.map((entry) => (
                  <p key={entry}>{entry}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
