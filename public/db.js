const Database = require('better-sqlite3');
const db = new Database('./data.db');

// Tạo bảng nếu chưa tồn tại
db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT,
    code TEXT,
    name TEXT,
    price INTEGER,
    cost_price INTEGER,
    stock INTEGER,
    pre_order INTEGER,
    location TEXT
  )
`).run();

module.exports = db;
