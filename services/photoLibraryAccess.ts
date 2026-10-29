import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/**
 * Android opens the system photo picker, which does not need broad photo
 * access. iOS still asks for the photo library.
 */
export async function requestPhotoLibraryAccess(): Promise<boolean> {
  if (Platform.OS === 'android') return true;
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}
