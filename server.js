const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const xlsx = require('xlsx');
const path = require('path');
const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

// Đọc user từ file Excel
function loadUsers() {
  const workbook = xlsx.readFile('users.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet);
}

// Route trang chủ
app.get('/', (req, res) => {
  res.redirect('/login.html'); // hoặc bạn có thể render main.html nếu đã đăng nhập
});

app.get('/main.html', (req, res) => {
  if (!req.session.user) return res.redirect('/login.html');

  res.sendFile(__dirname + '/public/main.html');
});

// Xử lý đăng nhập
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();

  const found = users.find(u => u.username === username && u.password === password);
  if (found) {
    req.session.user = {
        username: found.username,
        roles: found.roles.split(',').map(r => r.trim())
    };

    const userJS = JSON.stringify(req.session.user);

    res.send(`
        <script>
            localStorage.setItem("currentUser", ${JSON.stringify(userJS)});
            window.location.href = '/main.html';
        </script>
    `);
  } else {
    res.redirect('/login.html?error=true');
  }
});

// Đăng xuất
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send('Lỗi khi đăng xuất');
    }
    res.clearCookie('connect.sid'); // Xoá cookie session nếu dùng
    res.redirect('/login.html');
  });
});

//Trang bán hàng
app.get('/banhang.html', (req, res) => {
  if (!req.session.user) return res.redirect('/login.html');
  res.sendFile(__dirname + '/public/banhang.html');
});

//Tìm kiếm sp
const removeAccents = require('remove-accents');

app.get('/api/products/search', (req, res) => {
  const rawQ = (req.query.q || '').trim().toLowerCase();
  if (!rawQ) return res.json([]);

  const rows = db.prepare(`
    SELECT * FROM products
    WHERE LOWER(name) LIKE ? OR LOWER(code) LIKE ?
    ORDER BY sold DESC
  `).all(`%${rawQ}%`, `%${rawQ}%`);

  res.json(rows);
});

// thêm hàng sp đã bán
app.get('/api/products/top-sold', (req, res) => {
  const stmt = db.prepare(`
    SELECT * FROM products
    ORDER BY sold DESC
  `);
  const rows = stmt.all();
  res.json(rows);
});
// thêm sp
app.use(express.json());
app.post('/api/products', (req, res) => {
  const { name, price, code, location } = req.body;
  if (!name || isNaN(price)) {
    return res.status(400).json({ success: false, message: "Thiếu tên hoặc giá." });
  }

  const stmt = db.prepare(`
    INSERT INTO products (name, price, code, location, group_name, cost_price, stock, pre_order, sold)
    VALUES (?, ?, ?, ?, '', 0, 0, 0, 0)
  `);
  stmt.run(name, price, code || '', location || '');

  res.json({ success: true });
});

app.get('/api/customers/search', (req, res) => {
  let rawQ = (req.query.q || '').toLowerCase().trim();

  if (!rawQ) return res.json([]);

  let sql;
  let params;

  if (rawQ.startsWith("0")) {
    // Nếu tìm bằng số điện thoại → làm sạch
    const cleaned = rawQ.replace(/[.\s\-()]/g, '');
    sql = `
      SELECT * FROM customers
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '.', ''), '-', ''), ' ', ''), '(', ''), ')', '') LIKE ?
      LIMIT 10
    `;
    params = [`%${cleaned}%`];
  } else {
    // Tìm theo tên, mã
    const q = `%${rawQ}%`;
    sql = `
      SELECT * FROM customers
      WHERE LOWER(name) LIKE ? OR LOWER(id) LIKE ?
      LIMIT 10
    `;
    params = [q, q];
  }

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.post('/api/customers', (req, res) => {
  let { id, name, phone, group } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ success: false, message: "Thiếu thông tin." });
  }

  const getDiscount = (groupName) => {
    const text = (groupName || "").toLowerCase();
    const values = [];
    if (text.includes("3%")) values.push(3);
    if (text.includes("5%")) values.push(5);
    if (text.includes("vip 15")) values.push(15);
    else if (text.includes("vip")) values.push(10);
    return values.length ? Math.max(...values) : 0;
  };

  id = id || "KH" + Date.now();
  const discount = getDiscount(group);

  try {
    db.prepare(`
      INSERT INTO customers (id, name, phone, group_name, discount_percent, points, total_spent)
      VALUES (?, ?, ?, ?, ?, 0, 0)
    `).run(id, name, phone, group || "", discount);

    const newCustomer = { id, name, phone, group_name: group, discount_percent: discount, points: 0, total_spent: 0 };
    res.json({ success: true, customer: newCustomer });
  } catch (err) {
    res.status(500).json({ success: false, message: "Không thể thêm khách hàng." });
  }
});

app.post('/api/customers/update', (req, res) => {
  const { id, name, phone, group } = req.body;
  if (!id || !name || !phone) {
    return res.status(400).json({ success: false, message: "Thiếu thông tin." });
  }

  const getDiscount = (groupName) => {
    const text = (groupName || "").toLowerCase();
    const values = [];
    if (text.includes("3%")) values.push(3);
    if (text.includes("5%")) values.push(5);
    if (text.includes("vip 15")) values.push(15);
    else if (text.includes("vip")) values.push(10);
    return values.length ? Math.max(...values) : 0;
  };

  const discount = getDiscount(group);

  try {
    db.prepare(`
      UPDATE customers SET name=?, phone=?, group_name=?, discount_percent=?
      WHERE id=?
    `).run(name, phone, group, discount, id);

    const updated = { id, name, phone, group_name: group, discount_percent: discount };
    res.json({ success: true, customer: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Không thể cập nhật khách." });
  }
});

app.post('/api/orders/pending', (req, res) => {
  const { customer_name, customer_phone, product_code, product_name } = req.body;

  if (!customer_name || !customer_phone || !product_code || !product_name) {
    return res.status(400).json({ success: false, message: "Thiếu thông tin đơn đặt." });
  }

  try {
    // Lưu vào bảng orders_pending
    db.prepare(`
      INSERT INTO orders_pending (customer_name, customer_phone, product_code, product_name)
      VALUES (?, ?, ?, ?)
    `).run(customer_name, customer_phone, product_code, product_name);

    // Tăng KH đặt trong bảng products
    db.prepare(`
      UPDATE products SET pre_order = pre_order + 1 WHERE code = ?
    `).run(product_code);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Không thể lưu đơn đặt." });
  }
});

app.get('/api/orders/notify', (req, res) => {
  const stmt = db.prepare(`
    SELECT o.id, o.customer_name, o.customer_phone, o.product_name
    FROM orders_pending o
    JOIN products p ON o.product_code = p.code
    WHERE p.stock > 0 AND o.notified = 0
  `);
  const rows = stmt.all();
  res.json(rows);
});

app.post('/api/orders/mark-notified-one', (req, res) => {
  const { orderId, productCode } = req.body;

  try {
    db.prepare(`DELETE FROM orders_pending WHERE id = ?`).run(orderId);
    db.prepare(`UPDATE products SET pre_order = MAX(pre_order - 1, 0) WHERE code = ?`).run(productCode);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Không thể cập nhật." });
  }
});

app.post('/api/orders/checkout', (req, res) => {
  const { customer_id, note, total, items } = req.body;

  try {
    const customer = customer_id
      ? db.prepare(`SELECT * FROM customers WHERE id = ?`).get(customer_id)
      : null;

    const discount = parseFloat(req.body.discount || 0);
    const type = req.body.discount_type || '%';
    const discount_value = type === '%' ? Math.round(total * discount / 100) : discount;
    const final_total = total - discount_value;

    const product_names = items.map(i => i.product_name).join(", ");

    const insert = db.prepare(`
      INSERT INTO orders (customer_name, customer_phone, product_names, total, discount_value, final_total, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const i of items) {
      // trừ tồn kho (cho phép âm)
      db.prepare(`UPDATE products SET stock = stock - ? WHERE code = ?`)
        .run(i.quantity, i.product_code);
    }

    for (const i of items) {
      db.prepare(`UPDATE products SET sold = sold + ? WHERE code = ?`)
        .run(i.quantity, i.product_code);
    }

    insert.run(
      customer?.name || null,
      customer?.phone || null,
      product_names,
      total,
      discount_value,
      final_total,
      note
    );

    // Cập nhật điểm và mức giảm
    if (customer) {
      const pointEarned = Math.floor(final_total / 10000);
      const newPoints = customer.points + pointEarned;

      let newDiscount = 0;
      if (newPoints >= 10000) newDiscount = 10;
      else if (newPoints >= 5000) newDiscount = 5;
      else if (newPoints >= 3000) newDiscount = 3;

      if (newDiscount > customer.discount_percent) {
        db.prepare(`UPDATE customers SET points = ?, discount_percent = ? WHERE id = ?`)
          .run(newPoints, newDiscount, customer_id);
      } else {
        db.prepare(`UPDATE customers SET points = ? WHERE id = ?`)
          .run(newPoints, customer_id);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Không thể lưu đơn hàng." });
  }
});





app.listen(PORT, '0.0.0.0', () => {
  console.log("Server đang chạy tại cổng", PORT);
});

app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});