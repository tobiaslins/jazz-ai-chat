import { useAccount } from "jazz-react";
import { Chat, ListOfChatMessages } from "./schema";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ID } from "jazz-tools";
import { Account } from "jazz-tools";
import { Group } from "jazz-tools";

export function useCreateChat() {
  const router = useRouter();
  const { me } = useAccount();
  const [loading, setLoading] = useState(false);

  async function createChat() {
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
  }

  return { createChat, loading };
}
