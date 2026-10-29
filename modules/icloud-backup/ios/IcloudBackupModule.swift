import ExpoModulesCore
import Foundation

final class IcloudSignedOutException: Exception {
  override var reason: String {
    "iCloud is not signed in on this iPhone."
  }
}

final class IcloudContainerException: Exception {
  override var reason: String {
    "The iCloud Drive folder is not available yet."
  }
}

/// Copies a backup zip into this app's iCloud Drive container. The Apple ID
/// already on the phone is the only sign-in. There is no separate account.
@ExpoModule("IcloudBackup")
public class IcloudBackupModule: Module {
  @JS
  func availability() -> String {
    if FileManager.default.ubiquityIdentityToken == nil {
      return "signed-out"
    }
    return "ready"
  }

  @JS
  func saveZip(sourcePath: String, fileName: String) throws -> String {
    if FileManager.default.ubiquityIdentityToken == nil {
      throw IcloudSignedOutException()
    }
    guard let container = FileManager.default.url(forUbiquityContainerIdentifier: nil) else {
      throw IcloudContainerException()
    }
    let documents = container.appendingPathComponent("Documents", isDirectory: true)
    try FileManager.default.createDirectory(at: documents, withIntermediateDirectories: true)
    let destination = documents.appendingPathComponent(fileName, isDirectory: false)
    let source = sourceUrl(sourcePath)
    if FileManager.default.fileExists(atPath: destination.path) {
      try FileManager.default.removeItem(at: destination)
    }
    try FileManager.default.copyItem(at: source, to: destination)
    return destination.path
  }
}

private func sourceUrl(_ value: String) -> URL {
  if value.hasPrefix("file://"), let url = URL(string: value) {
    return url
  }
  return URL(fileURLWithPath: value)
}
