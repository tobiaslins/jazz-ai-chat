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
