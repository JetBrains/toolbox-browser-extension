const chidProcess = require('child_process');
const fs = require('fs');

const readme = fs.createWriteStream('dist/README.md');

readme.write('This is an open source project which is hosted on GitHub: [https://github.com/JetBrains/toolbox-browser-extension/](https://github.com/JetBrains/toolbox-browser-extension/).\n');
readme.write('\nUse the following data as your reference:\n');

const branch = chidProcess.execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
readme.write(`\n* Branch: ${branch}\n`);
const longSHA = chidProcess.execSync("git rev-parse HEAD").toString().trim();
readme.write(`* Commit SHA: ${longSHA}\n`);
const shortSHA = chidProcess.execSync("git rev-parse --short HEAD").toString().trim();
readme.write(`* Commit short SHA: ${shortSHA}\n`);
const authorName = chidProcess.execSync("git log -1 --pretty=format:'%an'").toString().trim();
readme.write(`* Commit author: ${authorName}\n`);
const commitTime = chidProcess.execSync("git log -1 --pretty=format:'%cd'").toString().trim();
readme.write(`* Commit time: ${commitTime}\n`);
const commitMsg = chidProcess.execSync("git log -1 --pretty=%B").toString().trim();
readme.write(`* Commit message: ${commitMsg}\n`);

readme.write('\nHow to build:\n');
readme.write('\n1. \`git clone git@github.com:JetBrains/toolbox-browser-extension.git\`\n');
readme.write('\n   OR  \n');
readme.write('\n   \`git clone https://github.com/JetBrains/toolbox-browser-extension.git\`  \n');
readme.write('2. \`cd \'toolbox-browser-extension\'\`\n');
readme.write(`3. \`git checkout \'${branch}\'\`\n`);
readme.write(`4. \`git reset --hard \'${longSHA}\'\`\n`);
readme.write('5. \`yarn install\`\n');
readme.write('6. \`yarn build\`\n');
readme.write('\n   The built code is saved in the \'dist\' subfolder:  \n');
readme.write('\n7. \`cd \'dist\'\`');

readme.end();
