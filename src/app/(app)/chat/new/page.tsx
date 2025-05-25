"use client";
import { useEffect, useRef } from "react";
import { useCreateChat } from "../../hooks";
import { useAccount } from "jazz-react";
import { ChatAccount } from "../../schema";

export default function NewChatPage() {
  const { createChat } = useCreateChat();
  const { me } = useAccount(ChatAccount);
  const didCreate = useRef(false);
  useEffect(() => {
    if (me && createChat && !didCreate.current) {
      didCreate.current = true;
      createChat();
    }
  }, [createChat, me]);

  return null;
}
