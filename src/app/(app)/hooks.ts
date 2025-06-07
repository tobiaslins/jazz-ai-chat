import { useAccount } from "jazz-react";
import { Chat, ChatAccount, ListOfChatMessages } from "./schema";
import { useState } from "react";
import type { ID } from "jazz-tools";
import { Account } from "jazz-tools";
import { Group } from "jazz-tools";
import { track } from "@vercel/analytics";

const JAZZ_WORKER_ID = "co_zm1eobD4gAy4hfPrsKR7vuEShYz";

export function useCreateChat() {
  const { me } = useAccount(ChatAccount);
  const [loading, setLoading] = useState(false);

  async function createChat() {
    setLoading(true);
    const group = Group.create();
    const worker = await Account.load(JAZZ_WORKER_ID as ID<Account>, {
      loadAs: me,
    });
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

    // Navigate to the new chat using route navigation
    window.history.pushState(null, "", `/chat/${chat.id}`);

    const loadedMe = await me.ensureLoaded({
      resolve: { root: { chats: true } },
    });

    loadedMe.root.chats.push(chat);

    track("Create Chat");
    setLoading(false);
  }

  return { createChat, loading };
}
