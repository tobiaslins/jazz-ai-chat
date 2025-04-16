"use client";

import type * as React from "react";
import { MessageSquare, Plus, Settings, User } from "lucide-react";

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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAccount } from "jazz-react";
import { useRouter } from "next/navigation";
import { useCreateChat } from "../hooks";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { me } = useAccount({ resolve: { root: { chats: { $each: true } } } });
  const { createChat, loading } = useCreateChat();

  const recentChats =
    me?.root?.chats
      ?.map((chat) => ({
        id: chat?.id,
        title: chat?.name,
        created: chat?._edits?.name?.madeAt,
        date: chat?._edits?.name?.madeAt?.toLocaleDateString(),
      }))
      .toSorted((a, b) => {
        return b.created.getTime() - a.created.getTime();
      }) || [];

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background w-full">
        <Sidebar className="w-64 border-r">
          <SidebarHeader className="p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    onClick={createChat}
                    variant="outline"
                    disabled={loading}
                    className="w-full justify-start"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {loading ? "Creating Chat..." : "New Chat"}
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
                      onClick={() => {
                        router.push(`/chat/${chat.id}`);
                      }}
                      variant="ghost"
                      className="w-full justify-start p-2 h-12"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
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
