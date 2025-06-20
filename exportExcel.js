const Database = require('better-sqlite3');
const xlsx = require('xlsx');
const fs = require('fs');

const db = new Database('./data.db');

const rows = db.prepare("SELECT * FROM products").all();

const exportData = rows.map(row => ({
  "Nhóm": row.group_name,
  "Mã Hàng": row.code,
  "Tên hàng": row.name,
  "Giá bán": row.price,
  "Giá Vốn": row.cost_price,
  "Tồn kho": row.stock,
  "KH đặt": row.pre_order,
  "Vị trí": row.location
}));

const worksheet = xlsx.utils.json_to_sheet(exportData);
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, "Sản phẩm");

const now = new Date();
const fileName = `khanhhang_${now.toISOString().split('T')[0]}.xlsx`;
xlsx.writeFile(workbook, fileName);

console.log(`✅ Dữ liệu đã được xuất ra file ${fileName}`);
