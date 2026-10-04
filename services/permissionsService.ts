import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

export const permissionsService = {
  async ensureCameraPermission() {
    const existing = await Camera.getCameraPermissionsAsync();
    if (existing.granted) {
      return { granted: true };
    }

    const requested = await Camera.requestCameraPermissionsAsync();
    return { granted: requested.granted };
  },

  async ensureMediaLibraryPermission() {
    const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (existing.granted) {
      return { granted: true };
    }

    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return { granted: requested.granted };
  },

  async openDeviceSettings() {
    await Linking.openSettings();
  },
};
