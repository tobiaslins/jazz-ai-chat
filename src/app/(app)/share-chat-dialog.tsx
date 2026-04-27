"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { useAll, useDb } from "@/lib/jazz-react-client";
import { app, type Chat } from "../../../schema";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function ShareChatDialog({
  chat,
  onClose,
}: {
  chat: Chat | null;
  onClose: () => void;
}) {
  const db = useDb();
  const open = chat !== null;

  const sharesQuery = useMemo(
    () => (chat ? app.chat_shares.where({ chat: chat.id }) : undefined),
    [chat]
  );
  const shares = useAll(sharesQuery) ?? [];

  const [userId, setUserId] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chat) return;
    const trimmed = userId.trim();
    if (!trimmed) return;
    if (shares.some((share) => share.user_id === trimmed)) {
      setError("Already shared with this user.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await db
        .insert(app.chat_shares, {
          chat: chat.id,
          user_id: trimmed,
          can_edit: canEdit,
          created_at: new Date().toISOString(),
        })
        .wait({ tier: "local" });
      setUserId("");
      setCanEdit(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share.");
    } finally {
      setSaving(false);
    }
  }

  function handleRevoke(shareId: string) {
    db.delete(app.chat_shares, shareId);
  }

  async function handleToggleEdit(shareId: string, next: boolean) {
    try {
      await db.update(app.chat_shares, shareId, { can_edit: next });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update share.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
          setUserId("");
          setCanEdit(false);
          setError(null);
        }
      }}
    >
      <DialogContent key={chat?.id ?? "none"}>
        <DialogHeader>
          <DialogTitle>Share chat</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAdd} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="share-user-id" className="text-xs">
              User ID
            </Label>
            <Input
              id="share-user-id"
              autoFocus
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="Paste a user ID"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="share-can-edit" className="text-xs">
              Can edit
            </Label>
            <Switch
              id="share-can-edit"
              checked={canEdit}
              onCheckedChange={setCanEdit}
            />
          </div>
          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={saving || !userId.trim()}>
              Share
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-2 space-y-2 border-t pt-3">
          <p className="text-xs font-medium text-gray-600">
            People with access
          </p>
          {shares.length === 0 ? (
            <p className="text-xs text-gray-500">
              Not shared with anyone yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {shares.map((share) => (
                <li
                  key={share.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate font-mono">
                    {share.user_id}
                  </span>
                  <div className="flex items-center gap-1">
                    <Label className="text-[10px] text-gray-500">edit</Label>
                    <Switch
                      checked={share.can_edit}
                      onCheckedChange={(next) =>
                        handleToggleEdit(share.id, next)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => handleRevoke(share.id)}
                    aria-label="Revoke access"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
