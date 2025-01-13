"use client";

import { useAccount } from "jazz-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { me } = useAccount();
  const [loading, setLoading] = useState(false)

  const createChat = async () => {
    setLoading(true)
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ userId: me.id }),
    });
    const { chatId } = await response.json();

    router.push(`/chat/${chatId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded-md"
        disabled={loading}
        type="button"
        onClick={createChat}
      >
        Create Chat
      </button>
    
    </div>
  );
}
