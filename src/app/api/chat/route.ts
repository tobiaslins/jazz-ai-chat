import { startWorker } from "jazz-nodejs";
import {
  Chat,
  ChatMessage,
  ListOfChatMessages,
  Reactions,
} from "../../(app)/schema";
import { Account, co, CoMap, CoPlainText, Group, Profile } from "jazz-tools";
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { after } from "next/server";

let jazz: Awaited<ReturnType<typeof startWorker>> | undefined;
export let worker: Account | undefined;

export async function getWorker() {
  if (!worker) {
    const w = await startWorker({
      syncServer: "wss://cloud.jazz.tools/?key=jazz-ai-chat-worker",
    });

    console.log("Worker started");
    jazz = w;
    worker = w.worker;
  }
  await jazz?.waitForConnection();
  return worker;
}

export async function POST(req: Request) {
  if (!jazz) {
    try {
      await getWorker();
    } catch (e) {
      console.error("Error starting worker", e);
      return new Response("Error starting worker", { status: 500 });
    }
  } else {
    console.log("Waiting for connection");
    await jazz.waitForConnection();
    console.log("Connection established");
  }

  const { userId, chatId } = await req.json();
  const account = await Account.load(userId, { loadAs: worker });
  console.log("Account loaded");
  if (!account) {
    return new Response("Account not found", { status: 404 });
  }

  let chat: Chat | null;

  // Load an existing chat

  chat = await Chat.load(chatId, {
    loadAs: worker,
    resolve: {
      messages: { $each: { text: true, reactions: true } },
    },
  });

  if (!chat) {
    console.error("Chat not found with id:" + chatId);
    return new Response("Chat not found", { status: 404 });
  }

  if (chat.name === "Unnamed" || chat.name === "Test") {
    // Generate a name for the chat
    const chatName = await generateText({
      model: openai("gpt-4.1-nano"),
      prompt: `Generate a title for this AI chat. Only answer with the name. It should be discriptive of what the chat is about. The current messages are: ${chat?.messages
        ?.map((message) => message?.content)
        .join("\n")}`,
    });
    chat.name = chatName.text;
  }

  const lastMessage = chat?.messages?.[chat?.messages?.length - 1];

  const chatMessage = ChatMessage.create(
    {
      content: "",
      text: CoPlainText.create("", { owner: chat._owner }),
      role: "assistant" as const,
      reactions: Reactions.create([], { owner: chat._owner }),
    },
    { owner: chat._owner }
  );
  chat.messages?.push(chatMessage);

  // generateText({
  //   model: openai("gpt-4.1-nano"),
  //   prompt: `Rarely generate a reaction for following message. Do it like a friend would, only if its really emotional or extreme message. Only answer with the reaction as emoji or empty string. Less is more - don't overreact.
  //   Message: ${lastMessage?.content}`,
  // }).then((r) => {
  //   if (r.text && r.text.length > 0) {
  //     lastMessage?.reactions?.push(r.text);
  //   }
  // });

  const result = streamText({
    model: openai("gpt-4.1-nano"),
    messages: [
      {
        role: "system",
        content: `You are like a friend in a whatsapp group chat. Don't ever say that youre here to hang out. Don't behave like a system. Only answer to the last message from the user. The messages before are just context.`,
      },
      ...(chat?.messages?.map((message) => ({
        role: "user" as const,
        content: message?.text?.toString() ?? "",
      })) ?? []),
    ],
  });

  let currentText = "";
  let lastUpdateTime = 0;
  let pendingText = "";
  const THROTTLE_TIME = 250;

  for await (const textPart of result.textStream) {
    pendingText += textPart;
    const now = Date.now();

    if (now - lastUpdateTime >= THROTTLE_TIME) {
      chatMessage.text?.insertAfter(chatMessage.text.length - 1, pendingText);
      currentText += pendingText;
      pendingText = "";
      lastUpdateTime = now;
    }
  }
  // Make sure any remaining text gets inserted
  if (pendingText) {
    chatMessage.text?.insertAfter(chatMessage.text.length - 1, pendingText);
    currentText += pendingText;
  }

  after(async () => {
    await worker?.waitForAllCoValuesSync({ timeout: 5000 });
  });

  return Response.json({
    chatId: chat?.id,
  });
}
