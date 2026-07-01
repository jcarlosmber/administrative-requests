const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'admin' }, 'supersecretkeyforentidadlocal2026', { expiresIn: '7d' });
fetch('http://localhost:3000/api/dependencies/b3533a28-69ee-4469-9553-76c1bb195b6d', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({ name: 'Secretaría Jurídica Distrital test' })
}).then(async r => {
  console.log('STATUS:', r.status);
  console.log('BODY:', await r.text());
}).catch(console.error);
