const fs = require('fs');
const file = 'd:/ZahidCodes/TheSeeks-Dashboard/src/components/layout/TopBar.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { db } from '../../firebase';", "import { db, auth } from '../../firebase';");
content = content.replace("const authMod = require('../../firebase').auth;", "");
content = content.replace("latestData.senderId === authMod?.currentUser?.uid", "latestData.senderId === auth?.currentUser?.uid");

fs.writeFileSync(file, content);
console.log('Fixed TopBar.tsx imports');
