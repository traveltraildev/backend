const bcrypt = require('bcryptjs');
const password = 'admin1233';
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);
console.log(hash);