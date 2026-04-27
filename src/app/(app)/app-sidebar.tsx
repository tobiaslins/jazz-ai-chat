"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Share2, Trash2, Users } from "lucide-react";

import { useAll, useDb, useSession } from "@/lib/jazz-react-client";
import { app, type Chat } from "../../../schema";

import { ShareChatDialog } from "./share-chat-dialog";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const db = useDb();
  const router = useRouter();
  const session = useSession();
  const sessionUserId = session?.user_id ?? null;
  const params = useParams<{ id?: string }>();
  const currentChatId = params?.id ?? null;

  const chatsQuery = useMemo(
    () => app.chats.orderBy("created_at", "desc").limit(100),
    []
  );
  const chats = useAll(chatsQuery) ?? [];

  const [renameTarget, setRenameTarget] = useState<Chat | null>(null);
  const [shareTarget, setShareTarget] = useState<Chat | null>(null);

  function handleDelete(chat: Chat) {
    db.delete(app.chats, chat.id);
    if (chat.id === currentChatId) {
      const nextChat = chats.find((c) => c.id !== chat.id);
      router.replace(nextChat ? `/chat/${nextChat.id}` : "/chat/new");
    }
  }

  function isOwner(chat: Chat) {
    return sessionUserId !== null && chat.owner_id === sessionUserId;
  }

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <Button asChild size="sm" className="justify-start">
            <Link href="/chat/new">
              <Plus className="h-4 w-4" />
              New chat
            </Link>
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Recent chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {chats.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-sidebar-foreground/60">
                    No chats yet.
                  </p>
                ) : (
                  chats.map((chat) => {
                    const owned = isOwner(chat);
                    return (
                      <SidebarMenuItem key={chat.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={chat.id === currentChatId}
                          tooltip={chat.title || "Untitled chat"}
                        >
                          <Link href={`/chat/${chat.id}`}>
                            <span>{chat.title?.trim() || "Untitled chat"}</span>
                            {!owned ? (
                              <Users className="ml-auto h-3 w-3 opacity-60" />
                            ) : null}
                          </Link>
                        </SidebarMenuButton>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction
                              showOnHover
                              aria-label="Chat options"
                            >
                              <MoreHorizontal />
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start">
                            <DropdownMenuItem
                              onSelect={(event) => {
                                event.preventDefault();
                                setRenameTarget(chat);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            {owned ? (
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  setShareTarget(chat);
                                }}
                              >
                                <Share2 className="mr-2 h-4 w-4" />
                                Share
                              </DropdownMenuItem>
                            ) : null}
                            {owned ? (
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  handleDelete(chat);
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          {sessionUserId ? (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(sessionUserId);
              }}
              className="truncate rounded px-2 py-1 text-left text-[10px] text-sidebar-foreground/60 hover:bg-sidebar-accent"
              title="Click to copy your user ID"
            >
              your id: {sessionUserId}
            </button>
          ) : null}
        </SidebarFooter>
      </Sidebar>

      <RenameChatDialog
        chat={renameTarget}
        onClose={() => setRenameTarget(null)}
      />
      <ShareChatDialog
        chat={shareTarget}
        onClose={() => setShareTarget(null)}
      />
    </>
  );
}

function RenameChatDialog({
  chat,
  onClose,
}: {
  chat: Chat | null;
  onClose: () => void;
}) {
  const db = useDb();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const open = chat !== null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
        // Re-seed the input value when the dialog opens for a new chat.
        key={chat?.id ?? "none"}
      >
        <DialogHeader>
          <DialogTitle>Rename chat</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!chat) return;
            const next = value.trim();
            if (!next || next === chat.title) {
              onClose();
              return;
            }
            setSaving(true);
            try {
              await db.update(app.chats, chat.id, { title: next });
              onClose();
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-4"
        >
          <Input
            autoFocus
            value={value || chat?.title || ""}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Chat title"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
