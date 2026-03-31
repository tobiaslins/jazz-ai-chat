import { definePermissions } from "jazz-tools/permissions";

import { app } from "./schema";

export default definePermissions(app, ({ policy, session, allowedTo }) => {
  policy.chats.allowRead.where({ owner_id: session.user_id });
  policy.chats.allowInsert.where({ owner_id: session.user_id });
  policy.chats.allowUpdate
    .whereOld({ owner_id: session.user_id })
    .whereNew({ owner_id: session.user_id });
  policy.chats.allowDelete.where({ owner_id: session.user_id });

  policy.messages.allowRead.where(allowedTo.read("chat"));
  policy.messages.allowInsert.where(allowedTo.insert("chat"));
  policy.messages.allowUpdate
    .whereOld(allowedTo.update("chat"))
    .whereNew(allowedTo.update("chat"));
  policy.messages.allowDelete.where(allowedTo.delete("chat"));
});
