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


app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});

//Tìm kiếm sp
const removeAccents = require('remove-accents');

app.get('/api/products/search', (req, res) => {
  const q = removeAccents(req.query.q || '').toLowerCase();
  const stmt = db.prepare("SELECT * FROM products");
  const rows = stmt.all();

  const matched = rows.filter(row => {
    const name = removeAccents(row.name || '').toLowerCase();
    const code = (row.code || '').toLowerCase();
    return name.includes(q) || code.includes(q);
  });

  res.json(matched.slice(0, 10));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log("Server đang chạy tại cổng", PORT);
});

