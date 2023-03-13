const childProcess = require('child_process');

childProcess.execSync('license-checker-rseidelsohn --csv --production --excludePackagesStartingWith "@jetbrains" --out dist/third-party-licenses.csv');
