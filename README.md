# Business Time Suite

Enterprise Timesheet Management System

Build a production-quality, multi-tenant enterprise timesheet management application named Robinstone Business Suite - Time which will be hosted on myTimesheets.app

Technology Stack

Use:

React

TypeScript

Vite

Tailwind CSS

shadcn/ui

TanStack Query

React Hook Form

Zod

Supabase PostgreSQL

Supabase Authentication

Supabase Storage

Supabase Edge Functions for privileged operations

Mailtrap for all email functionallity

The application is connected to my development Supabase project only.

Do not assume this database is production.

All database changes must be implemented as versioned SQL migration files.

Never use mock data after Supabase integration.

Never expose service-role keys or secrets in frontend code.

Application Goals

The application should support multiple organizations.

Each organization should be completely isolated from every other organization through Row Level Security.

Each organization may have:

Employees

Managers

Administrators

Projects

Project Categories

Customers (future)

Billing (future)

The architecture must support long-term expansion without redesign.

Core Modules

Implement these modules:

Authentication

Dashboard

Weekly Timesheets

Time Entry

Running Timer

Projects

Project Categories

Employee Management

Organization Settings

Approval Workflow

Reports

User Profile

Do not implement payroll yet.

Design the database so payroll can be added later.

User Roles

Support:

Administrator

Manager

Employee

Permissions must be enforced through Supabase Row Level Security.

Do not rely solely on frontend security.

Organization Branding

Every organization should have its own brand identity.

Create an Organization Branding section containing:

Organization Name

Logo

Light Logo

Dark Logo

Favicon

Primary Color

Secondary Color

Accent Color

Background Color

Navigation Color

Success Color

Warning Color

Error Color

Font Selection

Optional Custom CSS variables

Light Theme

Dark Theme

Store uploaded logos in Supabase Storage.

Generate CSS variables dynamically.

The UI should automatically use the organization's branding immediately after login.

Project Branding

Projects may optionally override organization branding.

Each project may define:

Project Logo

Project Icon

Primary Color

Accent Color

Header Image

If project branding exists:

Use it while viewing project pages, reports, dashboards, exports and timer screens.

Otherwise inherit organization branding.

Theme System

Create a reusable design system.

Use CSS variables.

Do not hardcode colors inside components.

Support:

Light Mode

Dark Mode

Automatic Theme

Organization Theme

Project Theme

Switching organizations or projects should update branding without reloading the application.

Projects

Projects belong to exactly one organization.

Projects contain:

Name

Code

Description

Customer

Status

Billing Rate

Start Date

End Date

Active Flag

Projects may be archived.

Never delete projects with historical time entries.

Project Categories

Categories belong to one project.

Examples:

Development

Meetings

Travel

Research

Installation

Support

Training

Categories may override project billing rate.

Prevent duplicate category names within a project.

Employee Assignment

Employees may be assigned to one or more projects.

Only assigned employees may log time against a project.

Categories displayed must belong only to the selected project.

Time Entry

Each entry contains:

Work Date

Project

Category

Start Time

End Time

Break Minutes

Duration Minutes

Notes

Billable

Store duration internally as integer minutes.

Never store floating-point hours.

Weekly Timesheets

Employees can:

Create

Edit

Save Draft

Submit

View History

Managers can:

Approve

Reject

Return for Correction

Administrators can:

Manage all timesheets inside their organization.

Reports

Support filtering by:

Employee

Organization

Project

Category

Date Range

Status

Billable

Provide:

Daily

Weekly

Monthly

Project Summary

Employee Summary

Category Summary

CSV export.

Design reporting queries for server-side execution.

Future Expansion

Design database to support future modules without major redesign:

Customers

Invoices

Billing

Payroll

Expense Tracking

Purchase Orders

Asset Tracking

Task Management

CRM

Scheduling

Work Orders

Document Storage

API Integrations

Database Requirements

Before creating tables:

Propose the complete normalized database schema.

Include:

Primary Keys

Foreign Keys

Indexes

Constraints

Audit Fields

Enums

Triggers

Views

Functions

RLS Policies

Do not execute schema until I approve it.

Security

Enable Row Level Security on every application table.

Create reusable helper functions for authorization.

Verify:

Employee isolation

Manager permissions

Administrator permissions

Cross-organization isolation

Never create unrestricted USING (true) policies.

Code Quality

Produce maintainable enterprise-quality code.

Requirements:

Reusable components

Strong typing

No duplicated business logic

Consistent naming

Error handling

Loading states

Empty states

Responsive layouts

Accessibility

Optimized SQL

Server-side filtering

Pagination

Development Workflow

Assume:

Lovable is connected only to the development Supabase project.

GitHub is the source of truth.

Every schema modification must be implemented as a migration.

Never make assumptions about production.

First Deliverable

Do not begin coding immediately.

Instead produce:

Overall application architecture.

Complete database schema.

Authentication design.

Authorization model.

Branding architecture.

Navigation structure.

Folder structure.

SQL migration plan.

RLS strategy.

List of assumptions requiring approval.

Wait for approval before generating database migrations or application code.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://brandtime-tracker.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5d7329b7-c875-4d5f-a36a-052456d807c8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
