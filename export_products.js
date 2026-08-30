const fs = require('fs');
let content = fs.readFileSync('products.js', 'utf8');
content = content.replace(/window\.PRIZM_PRODUCTS\s*=\s*products;/g, '');
const script = content + "\nfs.writeFileSync('products.json', JSON.stringify(products, null, 2));";
eval(script);
