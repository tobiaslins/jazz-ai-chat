CREATE TABLE chats (
    title TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE messages (
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);