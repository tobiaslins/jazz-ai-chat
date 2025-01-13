"use client";

import { clsx } from "clsx";
import { useCreateChat } from "./hooks";

export default function Home() {
  const { createChat, loading } = useCreateChat();

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <button
        className={clsx("bg-blue-500 text-white px-4 py-2 rounded-md", {
          "opacity-50 cursor-not-allowed": loading,
        })}
        disabled={loading}
        type="button"
        onClick={createChat}
      >
        {loading ? "Creating Chat..." : "Create Chat"}
      </button>
    </div>
  );
}
