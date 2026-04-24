-- ១. ទុកព័ត៌មានម្ចាស់ Bot (Admin)
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ២. ទុកទិន្នន័យចំណូលពី Group
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT,
    amount REAL,
    currency TEXT, -- USD ឬ KHR
    tip_amount REAL DEFAULT 0,
    tip_currency TEXT,
    trx_id TEXT UNIQUE,
    raw_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);