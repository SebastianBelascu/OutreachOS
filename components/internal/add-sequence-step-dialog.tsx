"use client";

import { useMemo, useState } from "react";
import { Plus, Variable } from "lucide-react";

import { createSequenceStepAction } from "@/app/(workspace)/actions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_VARIABLES, uniqueTemplateVariables } from "@/lib/outreach/variables";

export interface SequencePreviewLead {
  id: string;
  label: string;
  params: Record<string, string>;
}

interface AddSequenceStepDialogProps {
  campaignId: string;
  previewLeads?: SequencePreviewLead[];
}

function renderClientPreview(template: string, params: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => params[key] ?? "");
}

export function AddSequenceStepDialog({ campaignId, previewLeads = [] }: AddSequenceStepDialogProps) {
  const [subject, setSubject] = useState("Quick question for {{company}}");
  const [body, setBody] = useState("Hey {{first_name}},\n\nI noticed {{company}} and wanted to reach out.");
  const [previewLeadId, setPreviewLeadId] = useState(previewLeads[0]?.id ?? "sample");
  const previewLead =
    previewLeads.find((lead) => lead.id === previewLeadId) ??
    previewLeads[0] ?? {
      id: "sample",
      label: "Sample lead",
      params: {
        first_name: "Ana",
        last_name: "Pop",
        company: "Acme",
        website: "acme.com",
        industry: "SaaS",
        country: "RO",
        linkedin_url: "https://linkedin.com/company/acme",
        email: "ana@example.com",
      },
    };
  const variableOptions = useMemo(() => {
    const customKeys = Object.keys(previewLead.params).filter(
      (key) => !LEAD_VARIABLES.some((variable) => variable.key === key),
    );
    return [
      ...LEAD_VARIABLES.map((variable) => ({ key: variable.key, label: variable.label })),
      ...customKeys.map((key) => ({ key, label: key.replaceAll("_", " ") })),
    ];
  }, [previewLead.params]);
  const missingVariables = uniqueTemplateVariables(`${subject}\n${body}`).filter(
    (key) => !previewLead.params[key],
  );

  function appendVariable(key: string) {
    setBody((current) => `${current}${current.endsWith(" ") || current.endsWith("\n") ? "" : " "}{{${key}}}`);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" />
          Add step
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add sequence step</DialogTitle>
          <DialogDescription>Write with variables, preview against a real lead, and catch missing fields before launch.</DialogDescription>
        </DialogHeader>
        <form action={createSequenceStepAction} className="space-y-4">
          <input type="hidden" name="campaignId" value={campaignId} />
          <Tabs defaultValue="write" className="space-y-4">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
            </TabsList>
            <TabsContent value="write" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  name="body"
                  className="min-h-[220px]"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  required
                />
              </div>
            </TabsContent>
            <TabsContent value="preview" className="space-y-4">
              <div className="space-y-2">
                <Label>Preview lead</Label>
                <Select value={previewLead.id} onValueChange={setPreviewLeadId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sample">Sample lead</SelectItem>
                    {previewLeads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border bg-muted/20 p-4">
                <p className="text-sm font-semibold">{renderClientPreview(subject, previewLead.params)}</p>
                <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {renderClientPreview(body, previewLead.params)}
                </div>
              </div>
              {missingVariables.length ? (
                <p className="text-sm text-amber-700">
                  Missing for this lead: {missingVariables.map((key) => `{{${key}}}`).join(", ")}
                </p>
              ) : null}
            </TabsContent>
            <TabsContent value="variables" className="space-y-3">
              <div className="grid gap-2 md:grid-cols-3">
                {variableOptions.map((variable) => (
                  <Button key={variable.key} type="button" variant="outline" size="sm" onClick={() => appendVariable(variable.key)}>
                    <Variable className="size-3.5" />
                    {`{{${variable.key}}}`}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Custom CSV columns become variables automatically after import.</p>
            </TabsContent>
          </Tabs>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="delayDaysMin">Min delay</Label>
              <Input id="delayDaysMin" name="delayDaysMin" type="number" defaultValue="0" min="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delayDaysMax">Max delay</Label>
              <Input id="delayDaysMax" name="delayDaysMax" type="number" defaultValue="0" min="0" />
            </div>
            <Label className="flex h-9 items-center gap-2 self-end rounded-md border px-3 text-sm">
              <Checkbox name="stopOnReply" defaultChecked />
              Stop on reply
            </Label>
          </div>
          <DialogFooter>
            <Button type="submit">Save step</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
