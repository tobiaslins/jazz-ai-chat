import { startWorker } from "jazz-nodejs";
import { Chat, ChatMessage, ListOfChatMessages } from "../../(app)/schema";
import { Account, co, CoMap, CoPlainText, Group, Profile } from "jazz-tools";
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { after } from "next/server";

let worker: Account | undefined;

export async function POST(req: Request) {
  if (!worker) {
    try {
      const w = await startWorker({
        syncServer: "wss://cloud.jazz.tools/?key=jazz-ai-chat",
      });

      console.log("Worker started");
      worker = w.worker;
    } catch (e) {
      console.error("Error starting worker", e);
      return new Response("Error starting worker", { status: 500 });
    }
  }

  const { userId, chatId } = await req.json();
  const account = await Account.load(userId, worker, {});

  if (!account) {
    return new Response("Account not found", { status: 404 });
  }

  let chat: Chat | undefined;

  // Load an existing chat
  chat = await Chat.load(chatId, worker, { messages: [{ text: [] }] });

  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  if (chat.name === "Unnamed" || chat.name === "Test") {
    // Generate a name for the chat
    const test = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Generate a name for this AI chat. Only answer with the name. The current messages are: ${chat?.messages
        ?.map((message) => message?.content)
        .join("\n")}`,
    });
    chat.name = test.text;
  }

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages:
      chat?.messages?.map((message) => ({
        role: "user",
        content: message?.text?.toString() ?? "",
      })) ?? [],
  });

  const chatMessage = ChatMessage.create(
    {
      content: "",
      text: CoPlainText.create("", { owner: chat._owner }),
      role: "system",
    },
    { owner: chat._owner }
  );
  chat.messages?.push(chatMessage);

  let currentText = "";
  for await (const textPart of result.textStream) {
    chatMessage.text?.insertAfter(currentText.length, textPart);
    currentText = currentText + textPart;
  }

  after(async () => {
    await worker?.waitForAllCoValuesSync({ timeout: 5000 });
  });

  return Response.json({
    chatId: chat?.id,
  });
}
