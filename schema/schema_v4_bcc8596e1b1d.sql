CREATE TABLE chats (
    title TEXT NOT NULL,
    created_at TEXT NOT NULL,
    owner_id TEXT NOT NULL
);
CREATE POLICY chats_select_policy ON chats FOR SELECT USING (owner_id = @session.user_id);
CREATE POLICY chats_insert_policy ON chats FOR INSERT WITH CHECK (owner_id = @session.user_id);
CREATE POLICY chats_update_policy ON chats FOR UPDATE USING (owner_id = @session.user_id) WITH CHECK (owner_id = @session.user_id);
CREATE POLICY chats_delete_policy ON chats FOR DELETE USING (owner_id = @session.user_id);

CREATE TABLE messages (
    chat UUID REFERENCES chats NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE POLICY messages_select_policy ON messages FOR SELECT USING (INHERITS SELECT VIA chat);
CREATE POLICY messages_insert_policy ON messages FOR INSERT WITH CHECK (INHERITS INSERT VIA chat);
CREATE POLICY messages_update_policy ON messages FOR UPDATE USING (INHERITS UPDATE VIA chat) WITH CHECK (INHERITS UPDATE VIA chat);
CREATE POLICY messages_delete_policy ON messages FOR DELETE USING (INHERITS DELETE VIA chat);