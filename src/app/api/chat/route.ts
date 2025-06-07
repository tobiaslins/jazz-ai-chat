import { Chat, ChatMessage } from "../../(app)/schema";
import { Account, CoPlainText } from "jazz-tools";
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { after } from "next/server";
import { getWorker } from "@/app/worker";
import { gateway, GatewayModelId } from "@vercel/ai-sdk-gateway";
import { defaultModel } from "@/lib/models";

export async function POST(req: Request) {
  const worker = await getWorker();

  const { userId, chatId, model: modelId } = await req.json();
  const account = await Account.load(userId, { loadAs: worker });

  const model = gateway((modelId as GatewayModelId) || defaultModel);

  if (!account) {
    return new Response("Account not found", { status: 404 });
  }

  let chat: Chat | null;

  // Load an existing chat

  chat = await Chat.load(chatId, {
    loadAs: worker,
    resolve: {
      messages: { $each: { text: true } },
    },
  });

  if (!chat) {
    console.error("Chat not found with id:" + chatId);
    return new Response("Chat not found", { status: 404 });
  }

  if (chat.name === "Unnamed" || chat.name === "Test") {
    // Generate a name for the chat
    const chatName = await generateText({
      model: model,
      prompt: `Generate a title for this AI chat. Only answer with the name. It should be discriptive of what the chat is about. The current messages are: ${chat?.messages
        ?.map((message) => message?.content)
        .join("\n")}`,
    });
    chat.name = chatName.text;
  }

  const chatMessage = ChatMessage.create(
    {
      content: "",
      text: CoPlainText.create("", { owner: chat._owner }),
      role: "assistant" as const,
    },
    { owner: chat._owner }
  );

  const result = streamText({
    model: model,
    messages: [
      {
        role: "system",
        content: `You are like a friend in a whatsapp group chat. Don't ever say that youre here to hang out. Don't behave like a system. Only answer to the last message from the user. The messages before are just context.`,
      },
      ...(chat?.messages?.slice(-5)?.map((message) => ({
        role: message?.role ?? "user",
        content: message?.text?.toString() ?? "",
      })) ?? []),
    ],
  });

  chat.messages?.push(chatMessage);

  let currentText = "";
  let lastUpdateTime = 0;
  const THROTTLE_TIME = 250;

  for await (const textPart of result.textStream) {
    currentText += textPart;
    const now = Date.now();

    if (now - lastUpdateTime >= THROTTLE_TIME) {
      chatMessage.text.applyDiff(currentText);

      lastUpdateTime = now;
    }
  }
  // Make sure any remaining text gets inserted

  chatMessage.text?.applyDiff(currentText);

  after(async () => {
    await worker?.waitForAllCoValuesSync({ timeout: 5000 });
  });

  return Response.json({
    chatId: chat?.id,
  });
}
