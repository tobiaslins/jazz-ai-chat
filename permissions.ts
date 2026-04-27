import { definePermissions } from "jazz-tools/permissions";

import { app } from "./schema";

export default definePermissions(app, ({ policy, session, allowedTo, anyOf }) => {
  policy.chats.allowRead.where((chat) =>
    anyOf([
      { owner_id: session.user_id },
      policy.chat_shares.exists.where({
        chat: chat.id,
        user_id: session.user_id,
      }),
    ]),
  );
  policy.chats.allowInsert.always();
  policy.chats.allowUpdate
    .whereOld((chat) =>
      anyOf([
        { owner_id: session.user_id },
        policy.chat_shares.exists.where({
          chat: chat.id,
          user_id: session.user_id,
          can_edit: true,
        }),
      ]),
    )
    .whereNew((chat) =>
      anyOf([
        { owner_id: session.user_id },
        policy.chat_shares.exists.where({
          chat: chat.id,
          user_id: session.user_id,
          can_edit: true,
        }),
      ]),
    );
  policy.chats.allowDelete.where({ owner_id: session.user_id });

  // Only the chat owner can manage shares. `allowedTo.delete("chat")` checks
  // the delete policy of the referenced chat — which is owner-only above.
  policy.chat_shares.allowInsert.where(allowedTo.delete("chat"));
  policy.chat_shares.allowUpdate
    .whereOld(allowedTo.delete("chat"))
    .whereNew(allowedTo.delete("chat"));
  policy.chat_shares.allowDelete.where(allowedTo.delete("chat"));
  policy.chat_shares.allowRead.where((share) =>
    anyOf([
      { user_id: session.user_id },
      allowedTo.delete("chat"),
    ]),
  );

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
