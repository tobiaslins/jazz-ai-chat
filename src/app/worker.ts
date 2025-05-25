import { startWorker } from "jazz-nodejs";
import { Account } from "jazz-tools";

let jazz: Awaited<ReturnType<typeof startWorker>> | undefined;
export let worker: Account | undefined;

export async function getWorker() {
  if (!worker) {
    const w = await startWorker({
      syncServer: "wss://cloud.jazz.tools/?key=jazz-ai-chat-worker",
    });

    console.log("Worker started");
    jazz = w;
    worker = w.worker;
  }
  await jazz?.waitForConnection();
  return worker;
}
