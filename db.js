const Database = require('better-sqlite3');
const db = new Database('./data.db');

// Tạo bảng nếu chưa tồn tại
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT,
    code TEXT,
    name TEXT,
    price INTEGER,
    cost_price INTEGER,
    stock INTEGER,
    pre_order INTEGER,
    location TEXT,
    sold INTEGER DEFAULT 0
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS orders_pending (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    customer_phone TEXT,
    product_code TEXT,
    product_name TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    notified INTEGER DEFAULT 0
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      customer_phone TEXT,
      product_names TEXT,
      total INTEGER,
      discount_value INTEGER,
      final_total INTEGER,
      note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    roles TEXT -- dạng chuỗi: "admin,sell,kho"
  )
`);

module.exports = db;