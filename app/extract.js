import { readFile } from 'fs/promises';

async function main() {
  const content = await readFile('src/services/firebase.js', 'utf-8');
  console.log("Firebase config extracted!");
  // I will just print out the content so I can see the config
  console.log(content);
}

main();
