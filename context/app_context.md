# OutreachOS — Internal Lead Generation Infrastructure

## Overview

OutreachOS is an internal lead generation and cold email outreach platform built for SmartFusion.

The goal of the project is to create a scalable, low-cost internal infrastructure for:
- lead management,
- cold email campaigns,
- follow-up automation,
- analytics,
- and outreach operations.

The platform is NOT intended to compete with Instantly, Smartlead, Apollo, or enterprise CRMs.

Instead, the goal is to build a lightweight, highly customizable internal operating system optimized for:
- agency lead generation,
- outbound acquisition,
- cold email workflows,
- and scalable outreach infrastructure.

---

# Main Goals

## Primary Objectives

- Reduce dependency on expensive SaaS tools
- Lower operational costs for outbound campaigns
- Centralize outreach workflows
- Manage leads internally
- Automate cold email campaigns
- Build scalable acquisition infrastructure
- Leverage technical skills for competitive advantage

---

# Core Philosophy

The product is designed as an:
# Internal Lead Operating System

Not:
- a CRM replacement,
- a full sales platform,
- or an enterprise SaaS.

The focus is:
- simplicity,
- speed,
- automation,
- scalability,
- and ownership of infrastructure.

---

# Tech Stack

## Frontend
- Next.js
- React
- TailwindCSS
- shadcn/ui

## Backend
- Next.js Server Actions / API Routes

## Database
- Supabase PostgreSQL

## Authentication
- Supabase Auth

## Email Sending
- Brevo API

## Scheduling / Workers
- Cron jobs
- Queue workers
- Background processing

## Hosting
- Vercel
- Supabase

---

# Core Features

# 1. Lead Management

The lead system is the foundation of the platform.

## Features

### Lead Import
- CSV upload
- Bulk import
- Duplicate protection
- Validation

### Lead Fields
- first_name
- last_name
- email
- company
- website
- industry
- country
- linkedin_url
- custom_fields

### Lead Statuses
- NEW
- CONTACTED
- OPENED
- REPLIED
- INTERESTED
- MEETING_BOOKED
- NOT_INTERESTED
- BOUNCED

### Lead Tags
Custom tags for segmentation:
- cold
- warm
- saas
- local-business
- real-estate
- scraped
- high-ticket

### Lead Notes
Internal notes attached to leads.

### Search & Filtering
- search by company
- search by email
- filter by tags
- filter by status
- filter by campaign

---

# 2. Campaign System

Campaigns manage outreach flows.

## Features

### Campaign Creation
- campaign name
- sending inbox
- daily limits
- timezone settings

### Campaign Targeting
- select lead groups
- segment by filters
- bulk assignment

### Campaign States
- active
- paused
- completed

---

# 3. Email Sequences

Automated follow-up system.

## Features

### Multi-Step Sequences
Example:
- Step 1 → Initial email
- Step 2 → Follow-up after 2 days
- Step 3 → Final bump

### Dynamic Variables
Support:
- {{first_name}}
- {{company}}
- {{website}}

### Delay Randomization
Example:
- 2-4 days random delay
- randomized sending times

### Stop On Reply
Automatically stop sequences when a lead replies.

---

# 4. Email Sending Infrastructure

Emails are sent using Brevo.

## Features

### API-Based Sending
- transactional sending
- queue processing
- retry handling

### Sending Limits
- per inbox limits
- warmup-friendly behavior
- sending windows

### Sending Windows
Example:
- Monday-Friday
- 09:00-17:00
- timezone-aware sending

---

# 5. Tracking System

Tracks outreach activity.

## Events
- sent
- opened
- clicked
- replied
- bounced

## Open Tracking
Tracking pixel system:
- image-based tracking
- lightweight event logging

NOTE:
Open tracking is considered unreliable due to:
- Apple Mail Privacy
- Gmail image caching

Primary KPI should be:
- reply rate
- positive reply rate
- meetings booked

---

# 6. Reply Detection

Automatically detect inbound replies.

## Features

- inbox monitoring
- IMAP/webhook support
- reply parsing
- sequence stopping

---

# 7. Analytics Dashboard

Simple analytics focused on outreach performance.

## Metrics
- emails sent
- opens
- replies
- positive replies
- bounce rate
- meetings booked

## Campaign Analytics
- best-performing campaigns
- reply rate per sequence
- performance over time

---

# Database Architecture

## Main Tables

### leads
Stores lead data.

### campaigns
Stores campaign configuration.

### sequence_steps
Stores follow-up sequences.

### email_events
Stores tracking events.

### lead_tags
Stores lead segmentation tags.

### lead_notes
Stores internal notes.

---

# Infrastructure Philosophy

The platform should prioritize:
- modularity,
- simplicity,
- low operating costs,
- and scalability.

Avoid:
- unnecessary complexity,
- enterprise features,
- premature optimization.

---

# Future Features

These are NOT part of the MVP.

## Potential Future Additions

### AI Personalization
Generate personalized email intros automatically.

### Lead Enrichment
Find company data from domains.

### Automated Scraping
Import leads automatically from:
- directories
- websites
- public databases

### Multi-Workspace Support
Support multiple agency clients.

### Client Reporting
Generate automated outreach reports.

### AI Lead Scoring
Prioritize high-quality leads automatically.

---

# MVP Scope

The initial MVP should ONLY include:

## Leads
- CRUD
- CSV import
- tagging
- filtering

## Campaigns
- creation
- lead assignment
- sending configuration

## Sequences
- multi-step followups
- scheduling
- stop on reply

## Sending
- Brevo integration
- queues
- retry logic

## Tracking
- opens
- replies
- clicks

## Analytics
- basic metrics
- campaign performance

---

# Product Vision

The long-term vision is to build:
# Acquisition Infrastructure

A centralized system for:
- lead generation,
- outreach,
- automation,
- and scalable agency growth.

The platform should become:
- an internal growth engine,
- a leverage tool,
- and a core operational asset for SmartFusion.