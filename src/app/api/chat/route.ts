import { after } from "next/server";
import { streamText } from "ai";
import { gateway, type GatewayModelId } from "@ai-sdk/gateway";

import { defaultModel } from "@/lib/models";
import { getJazzBackendClient } from "@/lib/jazz-backend";

type InputMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages?: InputMessage[];
    model?: string;
  };

  const messages = (body.messages ?? [])
    .filter(
      (message) =>
        message &&
        typeof message.role === "string" &&
        typeof message.content === "string"
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-20);

  if (messages.length === 0) {
    return Response.json(
      { error: "At least one message is required." },
      { status: 400 }
    );
  }

  const modelId = (body.model || defaultModel) as GatewayModelId;

  after(async () => {
    await generateAndPersistAssistantMessage(messages, modelId);
  });

  return new Response(null, { status: 202 });
}

async function generateAndPersistAssistantMessage(
  messages: InputMessage[],
  modelId: GatewayModelId
) {
  const client = await getJazzBackendClient();
  const createdAt = new Date().toISOString();

  const initialValues = [
    { type: "Text", value: "assistant" },
    { type: "Text", value: "" },
    { type: "Text", value: createdAt },
  ];

  const assistantId = client.create("messages", initialValues);

  try {
    const result = streamText({
      model: gateway(modelId),
      messages: [
        {
          role: "system",
          content:
            "You are a helpful AI assistant. Keep answers concise and practical.",
        },
        ...messages,
      ],
    });

    let text = "";
    let lastUpdateAt = 0;

    for await (const chunk of result.textStream) {
      text += chunk;

      const now = Date.now();
      if (now - lastUpdateAt > 100) {
        client.update(assistantId, {
          content: { type: "Text", value: text },
        });
        lastUpdateAt = now;
      }
    }

    client.update(assistantId, {
      content: {
        type: "Text",
        value: text.trim()
          ? text
          : "Sorry, I couldn't generate a response. Please try again.",
      },
    });
  } catch {
    client.update(assistantId, {
      content: {
        type: "Text",
        value: "Sorry, I couldn't generate a response. Please try again.",
      },
    });
  }
}
