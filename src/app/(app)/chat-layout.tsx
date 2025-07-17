"use client";

import * as React from "react";
import { Plus, User } from "lucide-react";
import { track } from "@vercel/analytics";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { useAccount } from "jazz-react";
import { useParams } from "next/navigation";
import { ChatAccount } from "./schema";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const currentChatId = params.id as string | undefined;
  const { me } = useAccount(ChatAccount, {
    resolve: { root: { chats: { $each: true } }, profile: true },
  });

  const [profileName, setProfileName] = React.useState("");
  const [isProfileDialogOpen, setProfileDialogOpen] = React.useState(false);

  const recentChats =
    me?.root?.chats
      ?.map((chat) => ({
        id: chat?.id,
        title: chat?.name,
        created: chat?._edits?.name?.madeAt,
        date: chat?._edits?.name?.madeAt?.toLocaleDateString(),
      }))
      .toSorted((a, b) => {
        return (b?.created?.getTime() ?? 0) - (a?.created?.getTime() ?? 0);
      }) || [];

  return (
    <SidebarProvider>
      <div className="flex h-svh bg-background w-full">
        <Sidebar className="w-64 border-r">
          <SidebarHeader className="p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    onClick={() => {
                      track("New Chat Clicked", {
                        source: "sidebar",
                        currentChatId: currentChatId || "none",
                      });
                      router.push("/");
                    }}
                    variant="outline"
                    className="w-full justify-start"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    New Chat
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent className="px-4">
            <SidebarMenu>
              {recentChats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton asChild>
                    <Button
                      variant={"ghost"}
                      asChild
                      className={clsx(
                        "w-full justify-start p-2 h-12 hover:bg-stone-200 active:bg-stone-200",
                        currentChatId === chat.id ? "bg-stone-200" : ""
                      )}
                    >
                      <Link 
                        prefetch={false} 
                        href={`/chat/${chat.id}`}
                        onClick={() => {
                          track("Chat Selected", {
                            chatId: chat.id,
                            chatTitle: chat.title,
                            source: "sidebar",
                          });
                        }}
                      >
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">
                            {chat.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {chat.date}
                          </span>
                        </div>
                      </Link>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <Dialog
                  open={isProfileDialogOpen}
                  onOpenChange={(open) => {
                    if (open && me?.profile) {
                      setProfileName(me.profile.name);
                    }
                    setProfileDialogOpen(open);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      disabled={!me}
                      onClick={() => {
                        track("Profile Dialog Opened", {
                          currentName: me?.profile?.name || "unnamed",
                        });
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      {me?.profile?.name || "Profile"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        This is your display name.
                      </DialogDescription>
                    </DialogHeader>
                    <Input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          if (me?.profile) {
                            const previousName = me.profile.name;
                            me.profile.name = profileName;
                            track("Profile Updated", {
                              previousName: previousName || "unnamed",
                              newName: profileName,
                            });
                          }
                          setProfileDialogOpen(false);
                        }}
                      >
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
