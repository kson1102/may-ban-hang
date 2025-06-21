const Database = require('better-sqlite3');
const xlsx = require('xlsx');
const db = new Database('./data.db');

// Đọc Excel
const workbook = xlsx.readFile('./khanhhang.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

// Tạo bảng mới (ghi đè)
db.exec(`DROP TABLE IF EXISTS customers`);
db.exec(`
  CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    group_name TEXT,
    discount_percent INTEGER,
    points INTEGER,
    total_spent INTEGER
  )
`);

// Tính phần trăm giảm giá từ nhóm
function getDiscount(group) {
  if (!group) return 0;
  const text = group.toLowerCase();

  const discounts = [];

  if (text.includes("3%")) discounts.push(3);
  if (text.includes("5%")) discounts.push(5);
  if (text.includes("vip 15")) discounts.push(15);
  else if (text.includes("vip")) discounts.push(10); // tránh bị trùng

  return discounts.length ? Math.max(...discounts) : 0;
}


const insert = db.prepare(`
  INSERT INTO customers (id, name, phone, group_name, discount_percent, points, total_spent)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((rows) => {
  for (const r of rows) {
    const group = r["Nhóm khách hàng"] || "";
    insert.run(
      r["Mã khách hàng"] || "",
      r["Tên khách hàng"] || "",
      r["Điện thoại"] || "",
      group,
      getDiscount(group),
      r["Tổng điểm"] || 0,
      r["Tổng bán"] || 0
    );
  }
});

insertMany(data);
console.log("✅ Đã tạo lại bảng customers và import đầy đủ với nhóm + giảm giá.");
