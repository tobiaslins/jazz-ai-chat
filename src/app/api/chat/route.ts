import { startWorker } from "jazz-nodejs";
import { Chat, ChatMessage, ListOfChatMessages } from "../../(app)/schema";
import { Account, co, CoMap, Group, Profile } from "jazz-tools";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

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

  if (!chatId) {
    console.log("Creating new chat");
    // Create a new chat
    const group = Group.create({
      owner: worker,
    });
    group.addMember(account, "writer");

    chat = Chat.create(
      {
        messages: ListOfChatMessages.create([], {
          owner: group,
        }),
        name: "Test",
      },
      { owner: group }
    );

    return Response.json({
      chatId: chat?.id,
    });
  }

  // Load an existing chat

  chat = await Chat.load(chatId, worker, { messages: [{}] });
  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  const result = streamText({
    model: openai("gpt-4o"),
    messages:
      chat?.messages?.map((message) => ({
        role: "user",
        content: message?.content ?? "",
      })) ?? [],
  });

  const chatMessage = ChatMessage.create(
    { content: "", role: "system" },
    { owner: chat._owner }
  );
  chat.messages?.push(chatMessage);

  let lastUpdate = Date.now();
  let tmpContent = "";
  for await (const textPart of result.textStream) {
    tmpContent = tmpContent + textPart;
    const now = Date.now();
    if (now - lastUpdate >= 500) {
      chatMessage.content = tmpContent;

      lastUpdate = now;
    }
  }

  chatMessage.content = tmpContent;

  return Response.json({
    chatId: chat?.id,
  });
}
