const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

/**
 * Enables iCloud Documents so backups can use the default ubiquity container
 * (`url(forUbiquityContainerIdentifier: nil)` in the native module).
 *
 * We intentionally omit `com.apple.developer.icloud-container-identifiers`.
 * Registering a named container (e.g. iCloud.com.tradesreport.app) requires
 * Apple ID cookie auth on the Developer portal — ASC API keys cannot create
 * or link Cloud Containers. The App Store profile only grants
 * `icloud-services = *` until a container is linked in the portal.
 */
function withIcloudDocuments(config) {
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.icloud-services'] = ['CloudDocuments'];
    delete config.modResults['com.apple.developer.icloud-container-identifiers'];
    return config;
  });

  return withInfoPlist(config, (config) => {
    // Named Files.app folder needs a registered container; drop until portal link exists.
    if (config.modResults.NSUbiquitousContainers) {
      delete config.modResults.NSUbiquitousContainers;
    }
    return config;
  });
}

module.exports = withIcloudDocuments;
