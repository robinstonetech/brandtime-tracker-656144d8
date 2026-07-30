import { z } from "zod";

/** Zod schemas shared between client forms and server function validators. */

export const orgSchema = z.object({ organizationId: z.string().uuid() });

export const weekSchema = orgSchema.extend({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const startTimerSchema = orgSchema.extend({
  projectId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const entrySchema = orgSchema.extend({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.number().int().min(1).max(1440),
  projectId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isBillable: z.boolean().default(true),
});

export const updateEntrySchema = entrySchema.extend({ id: z.string().uuid() });

export const idSchema = z.object({ id: z.string().uuid() });

export const orgIdSchema = orgSchema.extend({ id: z.string().uuid() });

export const orgIdActiveSchema = orgIdSchema.extend({ isActive: z.boolean() });

export const orgIdArchivedSchema = orgIdSchema.extend({ archived: z.boolean() });

export const projectSchema = orgSchema.extend({
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().max(24).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  clientId: z.string().uuid().nullable().optional(),
  status: z.enum(["active", "on_hold", "archived"]).default("active"),
  isBillable: z.boolean().default(true),
  defaultHourlyRate: z.number().min(0).max(100000).nullable().optional(),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  memberIds: z.array(z.string().uuid()).default([]),
});

export const clientSchema = orgSchema.extend({
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(120),
  contactEmail: z.union([z.string().trim().email(), z.literal("")]).nullable().optional(),
});

export const categorySchema = orgSchema.extend({
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(80),
  isBillable: z.boolean().default(true),
  projectId: z.string().uuid({ message: "Select a project for this category" }),
});

export const appRoleSchema = z.enum(["owner", "admin", "manager", "member"]);

export const inviteSchema = orgSchema.extend({
  email: z.string().trim().email().max(254),
  role: appRoleSchema.default("member"),
});

export const memberRoleSchema = orgSchema.extend({
  userId: z.string().uuid(),
  role: appRoleSchema,
});

export const memberActiveSchema = orgSchema.extend({
  userId: z.string().uuid(),
  isActive: z.boolean(),
});

export const reviewSchema = z.object({
  timesheetId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(1000).optional(),
});

export const acceptInviteSchema = z.object({ token: z.string().trim().min(10).max(200) });
