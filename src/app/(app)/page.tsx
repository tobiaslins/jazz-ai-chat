"use client";

import { useAccount } from "jazz-react";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { me } = useAccount();

  const createChat = async () => {
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ userId: me.id }),
    });
    const { chatId } = await response.json();
    console.log(chatId);
    router.push(`/chat/${chatId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
        type="button"
        onClick={createChat}
      >
        Create Chat
      </button>
    </div>
  );
}
