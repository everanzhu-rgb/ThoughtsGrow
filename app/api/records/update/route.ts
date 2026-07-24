import { eq } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import {
  analysisVersions,
  conversationTurns,
  thinkingRecords,
  trainingSessions,
} from "@/db/schema";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = (await request.json()) as {
      action?: "analysis" | "conversation" | "training" | "review_complete";
      recordId?: string;
      summary?: string;
      primaryIssue?: string;
      structure?: unknown;
      assessments?: unknown;
      issues?: unknown;
      kind?: string;
      role?: string;
      content?: string;
      turnNumber?: number;
      focusElement?: string;
      focusStandard?: string;
      beforeScore?: number;
      afterScore?: number;
      report?: unknown;
      reportContent?: string;
    };
    if (!payload.recordId) {
      return Response.json({ error: "缺少记录编号" }, { status: 400 });
    }

    const db = getDb();
    if (payload.action === "analysis") {
      await db.insert(analysisVersions).values({
        id: crypto.randomUUID(),
        recordId: payload.recordId,
        version: 1,
        structureJson: JSON.stringify(payload.structure ?? {}),
        assessmentsJson: JSON.stringify(payload.assessments ?? []),
        issuesJson: JSON.stringify(payload.issues ?? []),
        frameworkVersion: "Critical Thinking Base V1.0",
      });
      await db
        .update(thinkingRecords)
        .set({
          status: "analyzed",
          summary: payload.summary || "",
          primaryIssue: payload.primaryIssue || "",
          analysisReportJson: JSON.stringify(payload.report ?? {}),
          reportContent: payload.reportContent || "",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(thinkingRecords.id, payload.recordId));
    }

    if (payload.action === "conversation") {
      await db.insert(conversationTurns).values({
        id: crypto.randomUUID(),
        recordId: payload.recordId,
        kind: payload.kind || "review",
        role: payload.role || "user",
        content: payload.content || "",
        turnNumber: payload.turnNumber || 1,
      });
    }

    if (payload.action === "training") {
      await db.insert(trainingSessions).values({
        id: crypto.randomUUID(),
        recordId: payload.recordId,
        focusElement: payload.focusElement || "观点",
        focusStandard: payload.focusStandard || "广度",
        beforeScore: payload.beforeScore ?? 58,
        afterScore: payload.afterScore ?? 72,
      });
      await db
        .update(thinkingRecords)
        .set({
          status: "trained",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(thinkingRecords.id, payload.recordId));
    }

    if (payload.action === "review_complete") {
      await db.update(thinkingRecords).set({ status: "reviewed", updatedAt: new Date().toISOString() }).where(eq(thinkingRecords.id, payload.recordId));
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 },
    );
  }
}
