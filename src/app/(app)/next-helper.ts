import { headers } from "next/headers";

export async function detectRequestType() {
  const headersList = await headers();

  const isRscRequest =
    headersList.get("accept") === "*/*" ||
    headersList.get("pragma") === "no-cache";

  return {
    isRSCRequest: isRscRequest,
  };
}
