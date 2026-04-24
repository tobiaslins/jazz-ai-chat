"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useDb } from "@/lib/jazz-react-client";
import toast from "react-hot-toast";

import { APP_ID, clearJazzBrowserIdentityStorage } from "@/lib/jazz-client-config";
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

export function StorageResetControl() {
  const db = useDb();
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (resetting) {
      return;
    }

    // Jazz currently logs instead of throwing when a follower tab calls
    // deleteClientStorage(), so guard the known runtime field first.
    if (getTabRole(db) === "follower") {
      toast.error("Close the other Jazz tab first, then retry the reset.");
      return;
    }

    setResetting(true);

    try {
      await db.deleteClientStorage();
      clearJazzBrowserIdentityStorage(APP_ID);
      window.location.replace("/chat/new");
    } catch (error) {
      setResetting(false);
      toast.error(
        error instanceof Error ? error.message : "Failed to reset local Jazz storage."
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !resetting && setOpen(nextOpen)}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed right-4 top-4 z-40 bg-white/95 shadow-sm backdrop-blur"
        >
          <RotateCcw className="h-4 w-4" />
          Reset storage
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset local Jazz state?</DialogTitle>
          <DialogDescription>
            This clears the browser Jazz database for this app, removes the local-first
            identity secret, and reloads into a fresh chat. Close any other tabs for this app
            first. Already-synced server data is not deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={resetting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void handleReset()} disabled={resetting}>
            {resetting ? "Resetting..." : "Reset now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getTabRole(db: object) {
  const maybeDb = db as { tabRole?: string };
  return maybeDb.tabRole;
}
