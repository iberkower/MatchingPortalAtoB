const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
try {
    const insert = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
    insert.run('mentee@test.com', 'pwd', 'mentee'); // mentee@test.com already exists
} catch (err) {
    console.log('Error message:', err.message);
}
