const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function test() {
    const db = new Database('database.sqlite');
    const email = 'test4@example.com';
    const password = 'password123';
    const role = 'mentee';
    const SECRET_KEY = 'atobe-secret-key';
    
    try {
        console.time('hash');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.timeEnd('hash');
        
        console.time('db');
        const insert = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
        const result = insert.run(email, hashedPassword, role);
        console.timeEnd('db');
        
        console.time('jwt');
        const token = jwt.sign({ id: result.lastInsertRowid, email, role }, SECRET_KEY);
        console.timeEnd('jwt');
        
        console.log('Success:', result.lastInsertRowid);
    } catch (err) {
        console.error('Caught error:', err.message);
    }
}
test();
