const chidProcess = require('child_process');
const { writeFileSync } = require('fs');

const buffer = [
  'The source code can be found here: [https://github.com/JetBrains/toolbox-browser-extension/](https://github.com/JetBrains/toolbox-browser-extension/).',
  '\nUse the following data as your reference:'
];

const branch = chidProcess.execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
buffer.push(`* Branch: ${branch}`);
const longSHA = chidProcess.execSync("git rev-parse HEAD").toString().trim();
buffer.push(`* Commit SHA: ${longSHA}`);
const shortSHA = chidProcess.execSync("git rev-parse --short HEAD").toString().trim();
buffer.push(`* Commit short SHA: ${shortSHA}`);
const authorName = chidProcess.execSync("git log -1 --pretty=format:'%an'").toString().trim();
buffer.push(`* Commit author: ${authorName}`);
const commitTime = chidProcess.execSync("git log -1 --pretty=format:'%cd'").toString().trim();
buffer.push(`* Commit time: ${commitTime}`);
const commitMsg = chidProcess.execSync("git log -1 --pretty=%B").toString().trim();
buffer.push(`* Commit message: ${commitMsg}`);

buffer.push('\nHow to build:');
buffer.push('1. Run \`yarn install\` to install all the dependencies');
buffer.push('2. Run \`yarn build\` to build the code and save it to the \'dist\' subfolder');

writeFileSync('dist/README.md', buffer.join('\n'));
