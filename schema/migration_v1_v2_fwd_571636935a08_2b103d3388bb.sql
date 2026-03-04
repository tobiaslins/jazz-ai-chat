CREATE TABLE chats (
    title TEXT NOT NULL,
    created_at TEXT NOT NULL
);
ALTER TABLE messages ADD COLUMN chat_id TEXT DEFAULT '';