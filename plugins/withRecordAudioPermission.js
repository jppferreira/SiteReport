const { AndroidConfig, createRunOncePlugin, withAndroidManifest } = require('@expo/config-plugins');

/**
 * Ensure RECORD_AUDIO stays declared for on-device voice notes.
 * expo-image-picker with microphonePermission:false used to block it app-wide.
 */
function withRecordAudioPermission(config) {
  config = AndroidConfig.Permissions.withPermissions(config, ['android.permission.RECORD_AUDIO']);

  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const permissions = manifest['uses-permission'] ?? [];
    let found = false;
    for (const entry of permissions) {
      if (entry.$?.['android:name'] !== 'android.permission.RECORD_AUDIO') continue;
      found = true;
      if (entry.$['tools:node'] === 'remove') {
        delete entry.$['tools:node'];
      }
    }
    if (!found) {
      permissions.push({ $: { 'android:name': 'android.permission.RECORD_AUDIO' } });
      manifest['uses-permission'] = permissions;
    }
    mod.modResults.manifest = manifest;
    return mod;
  });
}

module.exports = createRunOncePlugin(withRecordAudioPermission, 'with-record-audio-permission', '1.0.0');
