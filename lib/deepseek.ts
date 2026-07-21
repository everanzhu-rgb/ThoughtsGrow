import { env } from "cloudflare:workers";

type DeepSeekMessage = { role: "system" | "user" | "assistant"; content: string };

const API_URL = "https://api.deepseek.com/chat/completions";

export async function deepSeekJson<T>(messages: DeepSeekMessage[]): Promise<T> {
  const runtime = env as unknown as Record<string, string | undefined>;
  const apiKey = runtime.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek 尚未配置，请联系站点管理员。代码：MODEL_NOT_CONFIGURED");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: runtime.DEEPSEEK_MODEL || "deepseek-v4-flash",
      messages,
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 3000,
      stream: false,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    throw new Error(`DeepSeek 请求失败（${response.status}${requestId ? ` · ${requestId}` : ""}）`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("DeepSeek 没有返回可用内容，请重试。");
  const normalized = content.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(normalized) as T;
  } catch {
    throw new Error("DeepSeek 返回格式无法解析，请重试。");
  }
}

export const frameworkBrief = `
当前正式思维基座：Critical Thinking Base V1.0。
思维元素：目的、问题、信息、解释与推理、概念、假设、结果与意义、观点。
思维标准：清晰性、准确性、精确性、相关性、深度、广度、逻辑性、重要性、公正性。
基本原则：先重建结构，再依据文本证据评价质量；证据不足必须写“暂不评价”，不得臆测；每项结论都要指出文本依据。
`;
