import { NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function POST(request: Request) {
  try {
    const { messages, model, apiKey } = await request.json();

    const groqKey = apiKey || process.env.GROQ_API_KEY;

    if (!groqKey) {
      return NextResponse.json(
        {
          error:
            "Missing Groq API Key. Please add your free key in Settings > API Keys or set GROQ_API_KEY in .env. Get a free key at https://console.groq.com/keys",
          needsKey: true,
        },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required." }, { status: 400 });
    }

    // Default to active model on Groq
    const selectedModel = model || "openai/gpt-oss-120b";

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!groqResponse.ok) {
      const errData = await groqResponse.json().catch(() => ({}));
      const message =
        errData?.error?.message ||
        `Groq API responded with status ${groqResponse.status}: ${groqResponse.statusText}`;
      return NextResponse.json({ error: message }, { status: groqResponse.status });
    }

    const data = await groqResponse.json();
    const assistantMessage = data.choices?.[0]?.message?.content || "No response generated.";

    return NextResponse.json({
      role: "assistant",
      content: assistantMessage,
      model: selectedModel,
      usage: data.usage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
