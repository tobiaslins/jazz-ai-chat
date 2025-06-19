import {  FileStream, Group, ImageDefinition } from "jazz-tools";
import { experimental_generateImage, tool } from "ai";
import { z } from "zod/v4";
import { Chat, ChatMessage } from "@/app/(app)/schema";
import { openai } from "@ai-sdk/openai";
import sharp from "sharp";

export function createImageTool(chat: Chat, chatMessage: ChatMessage) {
  return tool({
    description:
      "Create an image from a prompt. Use it when the user asks to create, draw, or generate an image.",
    inputSchema: z.object({
      prompt: z.string().describe("The prompt to generate the image from."),
    }),
    execute: async ({ prompt }) => {
      const imageSize = 1024;
      const size = `${imageSize}x${imageSize}`;

      chatMessage.type = "image";
      chatMessage.text?.applyDiff("Creating image...");

      const { image: imageResponse } = await experimental_generateImage({
        model: openai.imageModel("dall-e-3"),
        prompt: prompt,
        size,
      });

      // Create a tiny 4x4 placeholder image using sharp
      const placeholderBuffer = await sharp(imageResponse.uint8Array)
        .resize(4, 4, {
          fit: "cover",
        })
        .blur(1)
        .toBuffer();

      // Convert the tiny blurred image to base64
      const blurredBase64 = `data:image/jpeg;base64,${placeholderBuffer.toString(
        "base64"
      )}`;

      const image = ImageDefinition.create(
        {
          originalSize: [imageSize, imageSize],
          placeholderDataURL: blurredBase64,
        },
        {
          owner: chat._owner.castAs(Group),
        }
      );

      chatMessage.image = image;
      chatMessage.text?.applyDiff("Image from prompt: " + prompt);

      const blob = new Blob([imageResponse.uint8Array], {
        type: "image/png",
      });

      // Create both full size and resized versions
      image[size] = await FileStream.createFromBlob(blob, {
        owner: chat._owner,
      });

      // Create 512x512 resized version
      const resizedBuffer = await sharp(imageResponse.uint8Array)
        .resize(512, 512, {
          fit: "cover",
        })
        .toBuffer();

      const resizedBlob = new Blob([resizedBuffer], {
        type: "image/png",
      });

      image["512x512"] = await FileStream.createFromBlob(resizedBlob, {
        owner: chat._owner,
      });
    },
  });
}
