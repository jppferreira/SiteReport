const fs = require('node:fs');
const path = require('node:path');

const { withDangerousMod } = require('@expo/config-plugins');

const STOREKIT_FILENAME = 'TradeReport.storekit';
const SOURCE = path.join('store', STOREKIT_FILENAME);
/** Relative to the .xcodeproj bundle. The file is copied next to that bundle. */
const SCHEME_IDENTIFIER = `../${STOREKIT_FILENAME}`;

const REFERENCE = `      <StoreKitConfigurationFileReference
         identifier = "${SCHEME_IDENTIFIER}">
      </StoreKitConfigurationFileReference>
`;

function schemePaths(iosRoot) {
  const projects = fs
    .readdirSync(iosRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('.xcodeproj'))
    .map((entry) => path.join(iosRoot, entry.name, 'xcshareddata', 'xcschemes'));
  return projects.flatMap((dir) => {
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => name.endsWith('.xcscheme'))
      .map((name) => path.join(dir, name));
  });
}

function attachStoreKit(schemeXml) {
  const withoutExisting = schemeXml.replace(
    /\s*<StoreKitConfigurationFileReference\b[\s\S]*?<\/StoreKitConfigurationFileReference>\s*/g,
    '\n',
  );
  if (!withoutExisting.includes('</LaunchAction>')) {
    throw new Error('Trade Report iOS scheme has no LaunchAction to attach the StoreKit configuration.');
  }
  return withoutExisting.replace(/\n[ \t]*<\/LaunchAction>/, `\n${REFERENCE}   </LaunchAction>`);
}

function withStoreKitConfig(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosRoot = config.modRequest.platformProjectRoot;
      const source = path.join(projectRoot, SOURCE);
      if (!fs.existsSync(source)) {
        throw new Error(`Missing StoreKit configuration at ${SOURCE}`);
      }
      fs.copyFileSync(source, path.join(iosRoot, STOREKIT_FILENAME));

      const schemes = schemePaths(iosRoot);
      if (schemes.length === 0) {
        throw new Error('No shared iOS scheme was generated, so the StoreKit configuration could not be attached.');
      }
      for (const schemePath of schemes) {
        const xml = fs.readFileSync(schemePath, 'utf8');
        fs.writeFileSync(schemePath, attachStoreKit(xml));
      }
      return config;
    },
  ]);
}

module.exports = withStoreKitConfig;
