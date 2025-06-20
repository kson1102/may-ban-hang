const sqlite3 = require('sqlite3').verbose();
const xlsx = require('xlsx');
const db = new sqlite3.Database('./data.db');

// Đọc Excel
const workbook = xlsx.readFile('./khanhhang.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

// Xóa bảng trước rồi thêm lại
db.serialize(() => {
  db.run("DELETE FROM products");

  const stmt = db.prepare(`
    INSERT INTO products (group_name, code, name, price, cost_price, stock, pre_order, location)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  data.forEach(row => {
    stmt.run(
      row["Nhóm"] || "",
      row["Mã Hàng"] || "",
      row["Tên hàng"] || "",
      row["Giá bán"] || 0,
      row["Giá Vốn"] || 0,
      row["Tồn kho"] || 0,
      row["KH đặt"] || 0,
      row["Vị trí"] || ""
    );
  });

  stmt.finalize();
  console.log("✅ Dữ liệu đã được nạp vào bảng products.");
});
