# OurSafeBase

**Event safety and compliance platform for student societies.**

OurSafeBase helps student organisations manage event safety — from codes of conduct and welfare contacts to anonymous incident reporting and post-event feedback — all through a mobile-first interface accessible via QR code.

[![Visit Website](https://img.shields.io/badge/Website-OurSafeBase-blue)](https://oursafebase.com/)

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Supabase](https://img.shields.io/badge/Supabase-Backend-green) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-blue)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Edge Functions](#edge-functions)
- [Environment Variables](#environment-variables)

---

## Overview

OurSafeBase is a full-stack SaaS platform designed for student unions and university societies. Each society creates events with a dedicated **Safety Page** — a mobile-optimised page containing emergency contacts, codes of conduct, incident reporting forms, and FAQs. Attendees access this page by scanning a QR code at the event.

### Core Problem

Student event safety relies on scattered group chats, unread PDFs, and informal processes. When something goes wrong, there's no structured way to report, track, or learn from incidents.

### Solution

A centralised platform that gives every event a professional safety infrastructure with:
- **Digital codes of conduct** with trackable acceptance
- **Anonymous incident reporting** with severity triage
- **Welfare contact directories** accessible via one scan
- **Post-event feedback** with automated email distribution
- **Analytics dashboards** for continuous improvement

---

## Features

| Feature | Description |
|---|---|
| **Society Management** | Create and manage societies with invite-code-based onboarding |
| **Event Creation** | Create events with slug-based URLs, duplicate past events |
| **Safety Pages** | Mobile-first event pages with emergency info, contacts, and reporting |
| **Code of Conduct** | Upload or write CoCs with version tracking and acceptance logging |
| **Incident Reporting** | Anonymous or named reports with severity levels and status workflow |
| **Feedback System** | Custom question builder with rating scales, multiple choice, and free text |
| **Automated Emails** | Feedback requests sent automatically after events via Resend |
| **Analytics** | Report trends, response times, feedback sentiment analysis |
| **QR Codes** | Generate and share QR codes linking to event safety pages |
| **Role-Based Access** | Committee members manage; attendees view and report |
| **Admin Dashboard** | Platform-level oversight of all societies |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui, Radix UI primitives |
| **State Management** | TanStack React Query (server state), React Context (auth) |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Email** | Resend (transactional emails via Edge Functions) |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                 React SPA                    │
│  (Vite + TypeScript + Tailwind + shadcn/ui) │
├─────────────────────────────────────────────┤
│             Supabase Client SDK              │
├──────────┬──────────┬───────────┬───────────┤
│   Auth   │ Database │  Storage  │   Edge    │
│ (Email/  │ (Postgres│ (Avatars, │ Functions │
│  OAuth)  │  + RLS)  │  Logos,   │ (Deno)    │
│          │          │  CoC PDFs)│           │
└──────────┴──────────┴───────────┴───────────┘
```

### Key Architectural Decisions

- **Row-Level Security (RLS)** on all tables — data access enforced at the database level using security-definer functions (`is_committee_member`, `is_society_member`, `has_role`)
- **Route-based code splitting** — all pages lazy-loaded via `React.lazy()` for fast initial load
- **Slug-based routing** — events accessible via `/:societySlug/:eventSlug` for clean, shareable URLs
- **Edge Functions** for server-side operations requiring secrets (email sending, account deletion)

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/oursafebase.git
cd oursafebase

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your Supabase credentials in .env

# Start development server
npm run dev
```

The app runs at `http://localhost:8080`.

### Build

```bash
npm run build
npm run preview
```

---

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui base components (Button, Dialog, etc.)
│   ├── ErrorBoundary    # Error handling wrappers
│   ├── EventQRCode      # QR code generation for events
│   ├── FAQSection       # Event FAQ management
│   ├── FeedbackSection  # Feedback collection and analytics
│   ├── ReportConcern    # Incident reporting dialogs
│   └── ...
├── hooks/               # Custom React hooks
│   ├── use-mobile       # Responsive breakpoint detection
│   ├── useEventSafety   # Event safety data queries
│   └── useLazyImage     # Intersection Observer image loading
├── integrations/
│   └── supabase/        # Auto-generated Supabase client and types
├── lib/                 # Shared utilities and business logic
│   ├── AuthContext      # Authentication provider (session management)
│   ├── auth             # Protected routes and session hooks
│   ├── activityLogger   # User activity tracking
│   ├── feedbackAnalytics # Feedback data aggregation
│   ├── reportAnalytics  # Report metrics calculation
│   └── constants        # App-wide configuration
├── pages/               # Route-level page components
│   ├── Landing          # Marketing homepage
│   ├── Auth             # Sign in / Sign up
│   ├── Dashboard        # User's society overview
│   ├── SocietyDashboard # Society management hub
│   ├── EventSafetyPage  # Public-facing event safety page
│   ├── SocietyReports   # Incident report management
│   └── ...
└── App.tsx              # Root component with routing

supabase/
├── config.toml          # Supabase project configuration
└── functions/           # Deno Edge Functions
    ├── send-feedback-request/   # Email feedback forms to attendees
    ├── send-feedback-reminder/  # Follow-up reminder emails
    ├── auto-send-feedback/      # Cron-triggered automatic sending
    ├── send-report-notification/# Alert committee of new reports
    ├── check-email-exists/      # Verify email before invite
    └── delete-account/          # GDPR-compliant account deletion
```

---

## Database Schema

### Core Entities

| Table | Purpose |
|---|---|
| `profiles` | User profiles (display name, avatar, phone) |
| `societies` | Organisations with invite codes and verification status |
| `society_members` | Membership with role (`committee` / `attendee`) |
| `events` | Events linked to societies with slug-based URLs |
| `reports` | Incident reports with severity, status workflow, and anonymity |
| `report_status_history` | Audit trail of report status changes |
| `code_of_conduct` | Versioned safety policies (text or PDF) |
| `code_acceptances` | Audit log of CoC acceptances with IP and user agent |
| `event_contacts` | Welfare and emergency contacts per event |
| `emergency_info` | Hospital, pharmacy, and duty officer details |
| `event_feedback_questions` | Custom feedback survey questions |
| `feedback_responses` / `feedback_answers` | Survey responses and answers |
| `event_faqs` | Frequently asked questions per event |
| `user_roles` | Platform-level roles (`admin` / `user`) |

### Security Model

All tables use **Row-Level Security** with helper functions:

- `is_committee_member(user_id, society_id)` — checks committee membership
- `is_society_member(user_id, society_id)` — checks any membership
- `has_role(user_id, role)` — checks platform-level roles
- `is_society_creator(user_id, society_id)` — checks society ownership

---

## Edge Functions

| Function | Trigger | Purpose |
|---|---|---|
| `send-feedback-request` | Manual (committee action) | Sends feedback survey emails to event attendees |
| `send-feedback-reminder` | Manual | Sends follow-up reminders for incomplete feedback |
| `auto-send-feedback` | Cron (post-event) | Automatically sends feedback requests after events end |
| `send-report-notification` | On report submission | Notifies committee members of new incident reports |
| `check-email-exists` | On invite | Validates whether an email is already registered |
| `delete-account` | User action | GDPR-compliant account deletion with data cleanup |

All functions use **Resend** for email delivery and require the following secrets:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME`

---

## Environment Variables

See [`.env.example`](.env.example) for required variables.

| Variable | Description |
|---|---|
| `VITE_SUPABASE_PROJECT_ID` | Supabase project identifier |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous/public key |
| `VITE_SUPABASE_URL` | Supabase API URL |
| `VITE_PUBLIC_APP_URL` | Production application URL |
| `VITE_RESET_PASSWORD_URL` | Password reset redirect URL |

---

## License

This project is proprietary. All rights reserved.
