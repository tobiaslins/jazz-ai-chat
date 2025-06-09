import { Chat, ChatMessage } from "../../(app)/schema";
import { Account, CoPlainText, FileStream } from "jazz-tools";
import { generateText, streamText } from "ai";
import { after } from "next/server";
import { getWorker } from "@/app/worker";
import { gateway, GatewayModelId } from "@vercel/ai-sdk-gateway";
import { defaultModel } from "@/lib/models";
import { z } from "zod";
import sharp from "sharp";
import { createImageTool } from "./tools";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { openai } from "@ai-sdk/openai";
import { readFile } from "fs/promises";

async function generateAudio(message: ChatMessage) {
  const audio = await generateSpeech({
    model: openai.speech("tts-1"),
    text: message.text?.toString() ?? "",
    voice: "alloy",
  });

  const file = await FileStream.createFromBlob(
    new Blob([audio.audio.uint8Array]),
    {
      owner: message._owner,
    }
  );

  message.audio = file;
}

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

  const shouldGenerateAudio = true;

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

  if (chat.name === "Unnamed") {
    // Generate a name for the chat
    generateText({
      model: gateway("openai/gpt-4.1-nano"),
      prompt: `Generate a title for this AI chat. Only answer with the name. It should be discriptive of what the chat is about. The current messages are: ${chat?.messages
        ?.map((message) => message?.text?.toString())
        .join("\n")}`,
    }).then((text) => {
      chat.name = text.text;
    });
  }

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
    tools: {
      createImage: createImageTool(chat),
    },
  });

  let chatMessage: ChatMessage | null = null;
  let currentText = "";
  let lastUpdateTime = 0;
  const THROTTLE_TIME = 250;

  for await (const textPart of result.textStream) {
    if (chatMessage === null && textPart) {
      chatMessage = ChatMessage.create(
        {
          type: "text",
          text: CoPlainText.create(textPart, { owner: chat._owner }),
          role: "assistant" as const,
        },
        { owner: chat._owner }
      );
      chat.messages?.push(chatMessage);
      currentText = textPart;
    } else if (chatMessage) {
      currentText += textPart;
      const now = Date.now();

      if (now - lastUpdateTime >= THROTTLE_TIME) {
        chatMessage.text?.applyDiff(currentText);
        lastUpdateTime = now;
      }
    }
  }
  // Make sure any remaining text gets inserted
  if (chatMessage) {
    chatMessage.text?.applyDiff(currentText);

    if (chat.generateAudio) {
      await generateAudio(chatMessage!);
    }
  }

  after(async () => {
    await worker?.waitForAllCoValuesSync({ timeout: 5000 });
  });

  return Response.json({
    chatId: chat?.id,
  });
}
