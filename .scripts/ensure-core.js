const fs = require('fs');

const readJsonFile = path => new Promise((resolve, reject) => {
  fs.readFile(path, 'utf8', (ioError, fileContent) => {
    if (ioError) {
      reject(ioError);
    } else {
      try {
        const parsedContent = JSON.parse(fileContent);
        resolve(parsedContent);
      } catch (e) {
        reject(e);
      }
    }
  });
});

Promise
  .all([readJsonFile('./package.json'), readJsonFile('./babel.config.json')])
  .then(([packageJson, babelConfigJson]) => {
    const installedCoreJsVersion = packageJson.devDependencies['core-js'].replace('^', '');
    const requiredCoreJsVersion = babelConfigJson.presets[0][1].corejs;

    if (!installedCoreJsVersion.startsWith(requiredCoreJsVersion)) {
      throw new Error(`The current version of core-js is ${installedCoreJsVersion}, but the babel config requires version ${requiredCoreJsVersion}. Update the babel.config.json file accordingly.`);
    }
  })
  .catch(e => {
    console.error(e.message);
  });
