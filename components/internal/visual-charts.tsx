"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type {
  DailySendingPoint,
  DomainReadinessPoint,
  FunnelPoint,
  InboxCapacityPoint,
} from "@/lib/outreach/types";

const volumeConfig = {
  sent: { label: "Sent", color: "hsl(var(--chart-1))" },
  delivered: { label: "Delivered", color: "hsl(var(--chart-2))" },
  opened: { label: "Opened", color: "hsl(var(--chart-3))" },
  bounced: { label: "Bounced", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const funnelConfig = {
  value: { label: "Count", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const capacityConfig = {
  used: { label: "Used", color: "hsl(var(--chart-1))" },
  remaining: { label: "Remaining", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const domainConfig = {
  ready: { label: "Ready inboxes", color: "hsl(var(--chart-2))" },
  blocked: { label: "Blocked", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed bg-muted/20 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function SendingVolumeChart({ data }: { data: DailySendingPoint[] }) {
  const hasData = data.some((point) => point.sent || point.delivered || point.opened || point.bounced);

  if (!hasData) {
    return <EmptyChart message="No sending activity yet. Once cron sends messages, trendul apare aici." />;
  }

  return (
    <ChartContainer config={volumeConfig} className="min-h-[260px] w-full">
      <AreaChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area dataKey="sent" type="natural" fill="var(--color-sent)" fillOpacity={0.18} stroke="var(--color-sent)" strokeWidth={2} />
        <Area dataKey="delivered" type="natural" fill="var(--color-delivered)" fillOpacity={0.14} stroke="var(--color-delivered)" strokeWidth={2} />
        <Area dataKey="opened" type="natural" fill="var(--color-opened)" fillOpacity={0.1} stroke="var(--color-opened)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}

export function OutreachFunnelChart({ data }: { data: FunnelPoint[] }) {
  const hasData = data.some((point) => point.value > 0);

  if (!hasData) {
    return <EmptyChart message="Importa leaduri si lanseaza o campanie ca sa vezi funnel-ul." />;
  }

  return (
    <ChartContainer config={funnelConfig} className="min-h-[260px] w-full">
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 32 }}>
        <CartesianGrid horizontal={false} />
        <YAxis dataKey="stage" type="category" tickLine={false} axisLine={false} width={82} />
        <XAxis type="number" hide />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4}>
          <LabelList dataKey="value" position="right" className="fill-foreground" fontSize={12} />
          {data.map((entry, index) => (
            <Cell key={entry.stage} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function InboxCapacityChart({ data }: { data: InboxCapacityPoint[] }) {
  if (!data.length) {
    return <EmptyChart message="Adauga inboxuri ca sa vezi capacitatea zilnica." />;
  }

  return (
    <ChartContainer config={capacityConfig} className="min-h-[260px] w-full">
      <BarChart accessibilityLayer data={data.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} />
        <YAxis dataKey="inbox" type="category" tickLine={false} axisLine={false} width={150} />
        <XAxis type="number" hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="used" stackId="a" fill="var(--color-used)" radius={[4, 0, 0, 4]} />
        <Bar dataKey="remaining" stackId="a" fill="var(--color-remaining)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function DomainHealthMap({ data }: { data: DomainReadinessPoint[] }) {
  if (!data.length) {
    return <EmptyChart message="Adauga domenii ca sa vezi harta de health." />;
  }

  return (
    <ChartContainer config={domainConfig} className="min-h-[220px] w-full">
      <BarChart accessibilityLayer data={data.slice(0, 8)} margin={{ left: 8, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="domain" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="ready" stackId="a" fill="var(--color-ready)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="blocked" stackId="a" fill="var(--color-blocked)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
