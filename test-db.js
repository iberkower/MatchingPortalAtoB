const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
try {
    const insert = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
    const result = insert.run('test3@example.com', 'password123', 'mentee');
    console.log('Success:', result.lastInsertRowid);
} catch (err) {
    console.error('Error:', err.message);
}
