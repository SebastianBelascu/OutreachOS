import crypto from "node:crypto";

import type { SendWindow } from "@/lib/outreach/types";

export const DEFAULT_SEND_WINDOW: SendWindow = {
  days: [1, 2, 3, 4, 5],
  startHour: 9,
  endHour: 17,
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function splitCommaValues(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createUnsubscribeToken(messageId: string) {
  return crypto.createHash("sha256").update(messageId).digest("hex");
}

export function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
    weekday: weekdayMap[lookup.weekday] ?? 1,
  };
}

export function isWithinSendWindow(date: Date, timeZone: string, sendWindow: SendWindow) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return (
    sendWindow.days.includes(parts.weekday) &&
    parts.hour >= sendWindow.startHour &&
    parts.hour < sendWindow.endHour
  );
}

export function clampSendWindow(sendWindow?: Partial<SendWindow>) {
  const nextWindow: SendWindow = {
    days: sendWindow?.days?.length ? sendWindow.days : DEFAULT_SEND_WINDOW.days,
    startHour:
      typeof sendWindow?.startHour === "number"
        ? sendWindow.startHour
        : DEFAULT_SEND_WINDOW.startHour,
    endHour:
      typeof sendWindow?.endHour === "number"
        ? sendWindow.endHour
        : DEFAULT_SEND_WINDOW.endHour,
  };

  return nextWindow;
}

export function randomBetween(min: number, max: number) {
  if (max <= min) {
    return min;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function addDelayDays(date: Date, minDays: number, maxDays: number) {
  const daysToAdd = randomBetween(minDays, maxDays);
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + daysToAdd);
  nextDate.setUTCMinutes(nextDate.getUTCMinutes() + randomBetween(5, 180));
  return nextDate;
}

export function textFromHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildEventKey(
  eventType: string,
  messageId: string,
  timestamp: string | number,
) {
  return `${eventType}:${messageId}:${timestamp}`;
}

export function startOfDayKey(date: Date, timeZone: string) {
  const parts = getDatePartsInTimeZone(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
