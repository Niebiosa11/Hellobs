'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const output = path.join(root, 'public');
fs.mkdirSync(output, {recursive:true});
const files = ['index.html','niebioska.html','przedluzanie-wlosow.html','szkolenie-male-laczenia.html','cennik.html','szkolenia.html','realizacje.html','konsultacja.html','rezerwacje.html','polityka-prywatnosci.html','404.html','robots.txt','sitemap.xml','google244d6d28ec4abc6d.html'];
for (const name of files) {
  const source = path.join(root,name);
  if (fs.existsSync(source)) fs.copyFileSync(source,path.join(output,name));
}
fs.cpSync(path.join(root,'assets'),path.join(output,'assets'),{recursive:true});

fs.cpSync(path.join(root,'admin-assets'),path.join(output,'admin-assets'),{recursive:true});
