import { Chat, ChatMessage, Credits } from "../../(app)/schema";
import { Account, CoPlainText, FileStream } from "jazz-tools";
import { generateText, streamText } from "ai";
import { after } from "next/server";
import { getWorker } from "@/app/worker";
import { gateway, GatewayModelId } from "@ai-sdk/gateway";
import { defaultModel } from "@/lib/models";
import { createImageTool } from "./tools";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { openai } from "@ai-sdk/openai";
import { track } from "@vercel/analytics/server";

async function generateAudio(message: ChatMessage) {
  const audio = await generateSpeech({
    model: openai.speech("tts-1"),
    text: message.text?.toString() ?? "",
    voice: "alloy",
    outputFormat: "mp3",
  });

  const file = await FileStream.createFromBlob(
    new Blob([audio.audio.uint8Array as unknown as ArrayBuffer], {
      type: "audio/mp3",
    }),
    {
      owner: message._owner,
    }
  );

  message.audio = file;
}

export async function POST(req: Request) {
  const worker = await getWorker();

  const { userId, chatId, model: modelId, creditsId } = await req.json();
  const account = await Account.load(userId, { loadAs: worker });

  const model = gateway((modelId as GatewayModelId) || defaultModel);

  if (!account) {
    track("API Error", {
      endpoint: "/api/chat",
      error: "account_not_found",
      userId,
    });
    return new Response("Account not found", { status: 404 });
  }

  // Check and deduct credits
  if (creditsId) {
    const credits = await Credits.load(creditsId, { loadAs: worker });
    if (!credits) {
      track("API Error", {
        endpoint: "/api/chat",
        error: "credits_not_found",
        userId,
        creditsId,
      });
      return new Response("Credits not found", { status: 404 });
    }

    if (credits.balance <= 0) {
      track("API Error", {
        endpoint: "/api/chat",
        error: "insufficient_credits",
        userId,
        balance: credits.balance,
      });
      return new Response("Insufficient credits", { status: 402 });
    }

    // Deduct one credit
    const previousBalance = credits.balance;
    credits.balance = credits.balance - 1;
    credits.lastUpdated = new Date().toISOString();

    track("Credit Deducted", {
      userId,
      previousBalance,
      newBalance: credits.balance,
      model: modelId,
    });

    console.log(`Deducted 1 credit. Remaining balance: ${credits.balance}`);
  }

  let chat: Chat | null;

  chat = await Chat.load(chatId, {
    loadAs: worker,
    resolve: {
      messages: {
        $each: {
          text: true,
        },
      },
    },
  });

  if (!chat) {
    console.error("Chat not found with id:" + chatId);
    track("API Error", {
      endpoint: "/api/chat",
      error: "chat_not_found",
      userId,
      chatId,
    });
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
      track("Chat Name Generated", {
        chatId: chat.id,
        generatedName: text.text,
        messageCount: chat.messages?.length || 0,
      });
    });
  }

  const messagesToAppend =
    chat?.messages?.slice(-5)?.map((message) => ({
      role: message?.role ?? "user",
      content: message?.text?.toString() ?? "",
    })) ?? [];

  const chatMessage = ChatMessage.create(
    {
      type: "text",
      text: CoPlainText.create("", { owner: chat._owner }),
      role: "assistant" as const,
    },
    { owner: chat._owner }
  );
  chat.messages?.push(chatMessage);

  const result = streamText({
    model: model,
    messages: [
      {
        role: "system",
        content: `You are a helpful AI assistant. Be friendly and conversational while providing accurate and relevant information. Focus on responding to the user's most recent message, using previous messages only for context. Aim to be clear, concise and natural in your responses.`,
      },
      ...messagesToAppend,
    ],
    tools: {
      createImage: createImageTool(chat, chatMessage),
    },
  });

  let currentText = "";
  let lastUpdateTime = 0;
  const THROTTLE_TIME = 250;

  for await (const textPart of result.textStream) {
    if (chatMessage) {
      currentText += textPart;
      const now = Date.now();

      if (now - lastUpdateTime >= THROTTLE_TIME) {
        try {
          chatMessage.text.applyDiff(currentText);
        } catch (e) {
          console.error("Error applying diff", {
            currentText,
            messageText: chatMessage.text?.toString(),
          });
          track("API Error", {
            endpoint: "/api/chat",
            error: "diff_apply_error",
            chatId,
            userId,
          });
        }
        lastUpdateTime = now;
      }
    }
  }
  // Make sure any remaining text gets inserted
  if (chatMessage) {
    try {
      chatMessage.text.applyDiff(currentText);
    } catch (e) {
      console.error("Error applying diff", {
        currentText,
        messageText: chatMessage.text?.toString(),
      });
      track("API Error", {
        endpoint: "/api/chat",
        error: "final_diff_apply_error",
        chatId,
        userId,
      });
    }

    if (chat.generateAudio) {
      try {
        await generateAudio(chatMessage!);
        track("Audio Generated", {
          chatId,
          messageId: chatMessage.id,
          model: modelId,
        });
      } catch (error) {
        track("API Error", {
          endpoint: "/api/chat",
          error: "audio_generation_failed",
          chatId,
          userId,
        });
      }
    }
  }

  after(async () => {
    await worker?.waitForAllCoValuesSync({ timeout: 5000 });
  });

  track("AI Response Generated", {
    chatId: chat?.id,
    model: modelId,
    userId,
    messageLength: currentText.length,
    hasAudio: !!chat.generateAudio,
  });

  return Response.json({
    chatId: chat?.id,
  });
}
