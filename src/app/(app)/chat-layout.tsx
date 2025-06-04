"use client";

import type * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

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

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const currentChatId = params.id as string | undefined;
  const { me } = useAccount(ChatAccount, {
    resolve: { root: { chats: { $each: true } } },
  });

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

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background w-full">
        <Sidebar className="w-64 border-r">
          <SidebarHeader className="p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    onClick={() => {
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
                      onClick={() => handleChatClick(chat.id!)}
                      variant={"ghost"}
                      className={clsx(
                        "w-full justify-start p-2 h-12",
                        currentChatId === chat.id ? "bg-gray-200" : ""
                      )}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">
                          {chat.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {chat.date}
                        </span>
                      </div>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-4">
            {/* <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button variant="ghost" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu> */}
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-1 flex-col">{children}</SidebarInset>
      </div>
    </SidebarProvider>
  );
}
