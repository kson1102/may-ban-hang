const Database = require('better-sqlite3');
const xlsx = require('xlsx');
const db = new Database('./data.db');

// Đọc Excel
const workbook = xlsx.readFile('./sanpham.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet); // ✅ ĐÂY là phần bị thiếu

// Chuẩn bị insert
const insert = db.prepare(`
  INSERT INTO products (group_name, code, name, price, cost_price, stock, pre_order, location, sold)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((products) => {
  for (const p of products) {
    insert.run(
      p["Nhóm"] || "",
      p["Mã Hàng"] || "",
      p["Tên hàng"] || "",
      p["Giá bán"] || 0,
      p["Giá Vốn"] || 0,
      p["Tồn kho"] || 0,
      p["KH đặt"] || 0,
      p["Vị trí"] || "", 0
    );
  }
});

db.prepare("DELETE FROM products").run();
insertMany(data);
console.log("✅ Dữ liệu đã được nạp vào bảng products.");
