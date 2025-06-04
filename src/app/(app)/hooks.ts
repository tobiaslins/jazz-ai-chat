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
      {
        loadAs: me,
      }
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

    // Use query params instead of route navigation
    const url = new URL(window.location.href);
    url.searchParams.set("chat", chat.id);
    window.history.pushState(null, "", url.toString());
    // Trigger a re-render by dispatching a custom event
    window.dispatchEvent(new PopStateEvent("popstate"));

    const loadedMe = await me.ensureLoaded({
      resolve: { root: { chats: true } },
    });

    loadedMe.root.chats.push(chat);

    track("Create Chat");
    setLoading(false);
  }

  return { createChat, loading };
}
