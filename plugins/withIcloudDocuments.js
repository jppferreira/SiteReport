const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

const CONTAINER = 'iCloud.com.tradesreport.app';

/** Exposes the app's iCloud Documents folder in Files → iCloud Drive → Trade Report. */
function withIcloudDocuments(config) {
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.icloud-services'] = ['CloudDocuments'];
    config.modResults['com.apple.developer.icloud-container-identifiers'] = [CONTAINER];
    return config;
  });

  return withInfoPlist(config, (config) => {
    const containers = config.modResults.NSUbiquitousContainers ?? {};
    containers[CONTAINER] = {
      NSUbiquitousContainerIsDocumentScopePublic: true,
      NSUbiquitousContainerName: 'Trade Report',
      NSUbiquitousContainerSupportedFolderLevels: 'Any',
    };
    config.modResults.NSUbiquitousContainers = containers;
    return config;
  });
}

module.exports = withIcloudDocuments;
