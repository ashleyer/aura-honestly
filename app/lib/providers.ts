// Model providers behind one function. Plain fetch, no SDKs, so the app has
// no provider lock-in and nothing to break when an SDK ships a major version.
//
// AURA_PROVIDER=anthropic | openai-compatible | demo
//   anthropic:          ANTHROPIC_API_KEY, ANTHROPIC_MODEL
//   openai-compatible:  OPENAI_COMPAT_BASE_URL, OPENAI_COMPAT_API_KEY, OPENAI_COMPAT_MODEL
//                       (any OpenAI-style /chat/completions endpoint: Nebius Token Factory,
//                        Gemini's OpenAI-compatible endpoint, a local vLLM, and so on)
//   demo:               no key needed; deterministic, clearly labeled output

export type ModelInput = {
  system: string;
  user: string;
  image?: { mediaType: string; base64: string };
};

export type ProviderName = "anthropic" | "openai-compatible" | "demo";

export function activeProvider(): ProviderName {
  const p = (process.env.AURA_PROVIDER || "").toLowerCase();
  if (p === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (p === "openai-compatible" && process.env.OPENAI_COMPAT_BASE_URL) return "openai-compatible";
  return "demo";
}

const TIMEOUT_MS = 45_000;

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Provider returned ${res.status}: ${detail}`);
  }
  return res.json();
}

async function callAnthropic(input: ModelInput): Promise<string> {
  const content: unknown[] = [];
  if (input.image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.image.mediaType, data: input.image.base64 },
    });
  }
  content.push({ type: "text", text: input.user });
  const data = await post(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": process.env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
    {
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 900,
      temperature: 0,
      system: input.system,
      messages: [{ role: "user", content }],
    },
  );
  return (data.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
}

async function callOpenAICompatible(input: ModelInput): Promise<string> {
  const base = process.env.OPENAI_COMPAT_BASE_URL!.replace(/\/+$/, "");
  const userContent: unknown[] = [{ type: "text", text: input.user }];
  if (input.image) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${input.image.mediaType};base64,${input.image.base64}` },
    });
  }
  const data = await post(
    `${base}/chat/completions`,
    { authorization: `Bearer ${process.env.OPENAI_COMPAT_API_KEY || ""}` },
    {
      model: process.env.OPENAI_COMPAT_MODEL,
      temperature: 0,
      max_tokens: 900,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: userContent },
      ],
    },
  );
  return data.choices?.[0]?.message?.content ?? "";
}

export async function callModel(provider: ProviderName, input: ModelInput): Promise<string> {
  if (provider === "anthropic") return callAnthropic(input);
  if (provider === "openai-compatible") return callOpenAICompatible(input);
  throw new Error("demo provider has no model call");
}

export function providerLabel(provider: ProviderName): string {
  if (provider === "anthropic") return process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  if (provider === "openai-compatible") return process.env.OPENAI_COMPAT_MODEL || "openai-compatible model";
  return "demo mode (no model connected)";
}
