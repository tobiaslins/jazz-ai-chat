## AI Chat using Jazz as storage/streaming

The schema:
```ts
import { co, CoMap, CoList } from "jazz-tools";

export class ChatMessage extends CoMap {
  content = co.string;
  role = co.literal("user", "system");
}

export class ListOfChatMessages extends CoList.Of(co.ref(ChatMessage)) {}

export class Chat extends CoMap {
  name = co.string;
  messages = co.ref(ListOfChatMessages);
}
```


### API Route that handles AI calls
https://github.com/tobiaslins/jazz-ai-chat/blob/main/src/app/api/chat/route.ts
