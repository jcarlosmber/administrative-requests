process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 1, email: 'test@test.com', role: 'admin' }, 'supersecretkeyforentidadlocal2026', { expiresIn: '7d' });
fetch('https://sasge.secretariajuridica.gov.co/api/requests/c1a11b0f-57bc-460e-bd57-113013fe906d', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({ status: "aprobado" })
}).then(async r => {
  console.log('STATUS:', r.status);
  console.log('BODY:', await r.text());
}).catch(console.error);
