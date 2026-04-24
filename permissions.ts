import { definePermissions } from "jazz-tools/permissions";

import { app } from "./schema";

export default definePermissions(app, ({ policy, session, allowedTo }) => {
  policy.chats.allowRead.where({ owner_id: session.user_id });
  policy.chats.allowInsert.always();
  policy.chats.allowUpdate
    .whereOld({ owner_id: session.user_id })
    .whereNew({ owner_id: session.user_id });
  policy.chats.allowDelete.where({ owner_id: session.user_id });

  policy.cursor_rooms.allowRead.always();
  policy.cursor_rooms.allowInsert.where({ $createdBy: session.user_id });
  policy.cursor_rooms.allowUpdate
    .whereOld({ $createdBy: session.user_id })
    .whereNew({ $createdBy: session.user_id });
  policy.cursor_rooms.allowDelete.where({ $createdBy: session.user_id });

  // Demo route: anyone with the room URL can publish and see cursor state.
  policy.cursor_presences.allowRead.always();
  policy.cursor_presences.allowInsert.always();
  policy.cursor_presences.allowUpdate.always();
  policy.cursor_presences.allowDelete.always();

  policy.messages.allowRead.where(allowedTo.read("chat"));
  policy.messages.allowInsert.where(allowedTo.update("chat"));
  policy.messages.allowUpdate
    .whereOld(allowedTo.update("chat"))
    .whereNew(allowedTo.update("chat"));
  policy.messages.allowDelete.where(allowedTo.delete("chat"));
});
