const fs = require('fs');
let code = fs.readFileSync('email.js', 'utf8');

const delayCode = "await new Promise(r => setTimeout(r, 1500));\n\n  // Email to mentor";

code = code.replace(/\/\/ Email to mentor/g, delayCode);
fs.writeFileSync('email.js', code);
