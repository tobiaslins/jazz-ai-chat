## AI Chat using Jazz as storage/streaming

The schema:

```ts
import { co } from "jazz-tools";

export const ChatMessage = co.map({
  content: z.string(),
  text: co.plainText(),
  role: z.enum(["user", "system", "assistant"]),
});

export const ListOfChatMessages = co.list(ChatMessage);

export const Chat = co.map({
  name: z.string(),
  messages: ListOfChatMessages,
});
```

### API Route that handles AI calls

https://github.com/tobiaslins/jazz-ai-chat/blob/main/src/app/api/chat/route.ts
