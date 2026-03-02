CREATE TABLE chats (
    title TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE messages (
    chat UUID REFERENCES chats NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);