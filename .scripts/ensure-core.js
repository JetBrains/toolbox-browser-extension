import fs from 'fs';

const readJsonFileSync = (path) => {
  const fileContent = fs.readFileSync(path, 'utf8');
  return JSON.parse(fileContent);
};

const writeJsonFileSync = (path, data) => {
  const dataString = JSON.stringify(data, null, 2);
  fs.writeFileSync(path, dataString, 'utf8');
};

try {
  const packageJson = readJsonFileSync('./package.json');
  const babelConfigJson = readJsonFileSync('./babel.config.json');

  const installedCoreJsVersion = packageJson.devDependencies['core-js'].replace('^', '');
  const requiredCoreJsVersion = babelConfigJson.presets[0][1].corejs;

  if (installedCoreJsVersion !== requiredCoreJsVersion) {
    console.error(`The current version of core-js ${installedCoreJsVersion} does not match the required version ${requiredCoreJsVersion} in babel.config.json, updating...`);
    babelConfigJson.presets[0][1].corejs = installedCoreJsVersion;
    writeJsonFileSync('./babel.config.json', babelConfigJson);
    console.log('babel.config.json has been updated with the new core-js version.');
  }
} catch (error) {
  console.error(error.message);
}
