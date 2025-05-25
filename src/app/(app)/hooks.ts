import { useAccount } from "jazz-react";
import { Chat, ChatAccount, ListOfChatMessages } from "./schema";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ID } from "jazz-tools";
import { Account } from "jazz-tools";
import { Group } from "jazz-tools";
import { track } from "@vercel/analytics";

export function useCreateChat() {
  const router = useRouter();
  const { me } = useAccount(ChatAccount);
  const [loading, setLoading] = useState(false);

  async function createChat() {
    setLoading(true);
    const group = Group.create();
    const worker = await Account.load(
      "co_zm1eobD4gAy4hfPrsKR7vuEShYz" as ID<Account>,
      {}
    );
    if (!worker) return;
    group.addMember(worker, "writer");

    const chat = await Chat.create(
      {
        messages: ListOfChatMessages.create([], { owner: group }),
        name: "Unnamed",
      },
      {
        owner: group,
      }
    );

    me?.root?.chats?.push(chat);
    router.push(`/chat/${chat.id}`);

    track("Create Chat");
    setLoading(false);
  }

  return { createChat, loading };
}
