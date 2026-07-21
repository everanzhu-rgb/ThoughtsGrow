import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const thinkingRecords = sqliteTable("thinking_records", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  scene: text("scene").notNull(),
  mode: text("mode").notNull().default("record"),
  status: text("status").notNull().default("saved"),
  summary: text("summary").notNull().default(""),
  primaryIssue: text("primary_issue").notNull().default(""),
  frameworkVersion: text("framework_version")
    .notNull()
    .default("Critical Thinking Base V1.0"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const analysisVersions = sqliteTable("analysis_versions", {
  id: text("id").primaryKey(),
  recordId: text("record_id").notNull(),
  version: integer("version").notNull().default(1),
  structureJson: text("structure_json").notNull().default("{}"),
  assessmentsJson: text("assessments_json").notNull().default("[]"),
  issuesJson: text("issues_json").notNull().default("[]"),
  frameworkVersion: text("framework_version").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const conversationTurns = sqliteTable("conversation_turns", {
  id: text("id").primaryKey(),
  recordId: text("record_id").notNull(),
  kind: text("kind").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  turnNumber: integer("turn_number").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const trainingSessions = sqliteTable("training_sessions", {
  id: text("id").primaryKey(),
  recordId: text("record_id").notNull(),
  topicId: text("topic_id"),
  focusElement: text("focus_element").notNull(),
  focusStandard: text("focus_standard").notNull(),
  beforeScore: real("before_score").notNull(),
  afterScore: real("after_score").notNull(),
  status: text("status").notNull().default("completed"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const trainingTopics = sqliteTable("training_topics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  focusElement: text("focus_element").notNull(),
  focusStandard: text("focus_standard").notNull(),
  status: text("status").notNull().default("active"),
  sessionCount: integer("session_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const assessmentFrameworks = sqliteTable("assessment_frameworks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  description: text("description").notNull().default(""),
  definitionJson: text("definition_json").notNull().default("{}"),
  status: text("status").notNull().default("active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const knowledgeImports = sqliteTable("knowledge_imports", {
  id: text("id").primaryKey(),
  content: text("content").notNull(),
  source: text("source").notNull(),
  note: text("note").notNull().default(""),
  analysisJson: text("analysis_json").notNull().default("{}"),
  disposition: text("disposition").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
