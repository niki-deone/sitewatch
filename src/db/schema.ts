// src/db/schema.ts
import { relations, sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["owner", "admin", "member", "viewer"]);
export const monitorStatusEnum = pgEnum("monitor_status", ["pending", "up", "degraded", "down"]);
export const checkStatusEnum = pgEnum("check_status", ["up", "degraded", "down"]);
export const httpMethodEnum = pgEnum("http_method", ["GET", "HEAD"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    githubId: text("github_id"),
    email: text("email"),
    name: text("name").notNull(),
    image: text("image"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_github_id_idx").on(t.githubId)],
);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  statusPagePublic: boolean("status_page_public").notNull().default(false),
  statusPageTitle: text("status_page_title"),
  webhookUrl: text("webhook_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workspaceId, t.userId] }), index("memberships_user_idx").on(t.userId)],
);

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  role: roleEnum("role").notNull().default("member"),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const monitors = pgTable(
  "monitors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    method: httpMethodEnum("method").notNull().default("GET"),
    expectedStatus: integer("expected_status"),
    keyword: text("keyword"),
    timeoutMs: integer("timeout_ms").notNull().default(10000),
    intervalSeconds: integer("interval_seconds").notNull().default(300),
    degradedThresholdMs: integer("degraded_threshold_ms").notNull().default(2000),
    paused: boolean("paused").notNull().default(false),
    showOnStatusPage: boolean("show_on_status_page").notNull().default(true),
    status: monitorStatusEnum("status").notNull().default("pending"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    lastLatencyMs: integer("last_latency_ms"),
    sslExpiresAt: timestamp("ssl_expires_at", { withTimezone: true }),
    sslCheckedAt: timestamp("ssl_checked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("monitors_workspace_idx").on(t.workspaceId),
    index("monitors_due_idx").on(t.paused, t.lastCheckedAt),
  ],
);

export const checks = pgTable(
  "checks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
    status: checkStatusEnum("status").notNull(),
    statusCode: integer("status_code"),
    latencyMs: integer("latency_ms"),
    error: text("error"),
  },
  (t) => [index("checks_monitor_time_idx").on(t.monitorId, t.checkedAt.desc())],
);

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitors.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    cause: text("cause").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    index("incidents_workspace_idx").on(t.workspaceId, t.startedAt.desc()),
    // At most one open incident per monitor, enforced by the database.
    uniqueIndex("incidents_one_open_per_monitor")
      .on(t.monitorId)
      .where(sql`${t.resolvedAt} is null`),
  ],
);

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  memberships: many(memberships),
  monitors: many(monitors),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  workspace: one(workspaces, { fields: [memberships.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const monitorsRelations = relations(monitors, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [monitors.workspaceId], references: [workspaces.id] }),
  checks: many(checks),
  incidents: many(incidents),
}));

export type Role = (typeof roleEnum.enumValues)[number];
export type MonitorStatus = (typeof monitorStatusEnum.enumValues)[number];
export type CheckStatus = (typeof checkStatusEnum.enumValues)[number];
export type Monitor = typeof monitors.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
