package expo.modules.googledrive

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.DocumentsContract
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.io.Serializable
import java.io.SyncFailedException

/**
 * Saves a zip into Google Drive without a Google sign-in.
 *
 * Drive does not support ACTION_OPEN_DOCUMENT_TREE, so a folder picker never
 * lists it. ACTION_CREATE_DOCUMENT does. The save screen opens on Drive when
 * the Drive app is installed, then the zip is copied into the file the user confirms.
 */
class GoogleDriveSaveModule : Module() {
  private lateinit var createDocumentLauncher: AppContextActivityResultLauncher<CreateDocumentOptions, CreateDocumentResult>
  private var pickerOpen = false

  override fun definition() = ModuleDefinition {
    Name("GoogleDriveSave")

    Function("availability") {
      try {
        if (driveInstalled()) "ready" else "missing-app"
      } catch (_: Exception) {
        "missing-app"
      }
    }

    AsyncFunction("saveZip") Coroutine { sourcePath: String, fileName: String ->
      saveZip(sourcePath, fileName)
    }

    RegisterActivityContracts {
      createDocumentLauncher = registerForActivityResult(CreateDocumentContract()) { _, _ -> }
    }
  }

  private val context
    get() = requireNotNull(appContext.reactContext) { "React Application Context is null" }

  private suspend fun saveZip(sourcePath: String, fileName: String): String {
    if (!driveInstalled()) throw DriveAppMissingException()
    val source = sourceFile(sourcePath)
    if (!source.isFile || source.length() <= 0L) throw DriveWriteException()

    val initial = withContext(Dispatchers.IO) { driveInitialUri()?.toString() }
    val picked = withContext(Dispatchers.Main) {
      if (pickerOpen) return@withContext CreateDocumentResult.Cancelled
      pickerOpen = true
      try {
        createDocumentLauncher.launch(CreateDocumentOptions(safeFileName(fileName), initial))
      } finally {
        pickerOpen = false
      }
    }

    return when (picked) {
      CreateDocumentResult.Cancelled -> "cancelled"
      CreateDocumentResult.Failed -> throw DriveWriteException()
      is CreateDocumentResult.Success -> {
        if (!isGoogleDrive(picked.uri)) {
          deleteQuietly(picked.uri)
          throw DriveNotSelectedException()
        }
        try {
          withContext(Dispatchers.IO) { copyToDrive(source, picked.uri) }
        } catch (error: DriveWriteException) {
          deleteQuietly(picked.uri)
          throw error
        } catch (error: Exception) {
          deleteQuietly(picked.uri)
          throw DriveWriteException(error)
        }
        "saved"
      }
    }
  }

  private fun driveInstalled(): Boolean {
    return try {
      @Suppress("DEPRECATION")
      context.packageManager.getPackageInfo("com.google.android.apps.docs", 0)
      true
    } catch (_: PackageManager.NameNotFoundException) {
      false
    }
  }

  /** Best-effort root so the save screen opens already inside Google Drive. */
  private fun driveInitialUri(): Uri? {
    val resolver = context.contentResolver
    for (authority in DRIVE_AUTHORITIES) {
      try {
        resolver.query(
          DocumentsContract.buildRootsUri(authority),
          arrayOf(DocumentsContract.Root.COLUMN_DOCUMENT_ID),
          null,
          null,
          null
        )?.use { cursor ->
          val index = cursor.getColumnIndex(DocumentsContract.Root.COLUMN_DOCUMENT_ID)
          if (index < 0) return@use
          while (cursor.moveToNext()) {
            val documentId = cursor.getString(index)
            if (!documentId.isNullOrBlank()) {
              return DocumentsContract.buildDocumentUri(authority, documentId)
            }
          }
        }
      } catch (_: Exception) {
        // Drive can hide its roots until the save screen is open.
      }
    }
    return null
  }

  private fun isGoogleDrive(uri: Uri): Boolean {
    val authority = uri.authority.orEmpty()
    if (authority.contains("com.google.android.apps.docs")) return true
    return try {
      DocumentsContract.getDocumentId(uri).startsWith("acc=")
    } catch (_: Exception) {
      false
    }
  }

  private fun copyToDrive(source: File, destination: Uri) {
    val expected = source.length()
    val resolver = context.contentResolver
    try {
      val descriptor = resolver.openFileDescriptor(destination, "wt")
      if (descriptor != null) {
        descriptor.use { parcel ->
          FileOutputStream(parcel.fileDescriptor).use { output ->
            val copied = source.inputStream().use { input -> input.copyTo(output, COPY_BUFFER) }
            if (copied != expected) throw DriveWriteException()
            output.flush()
            try {
              parcel.fileDescriptor.sync()
            } catch (_: SyncFailedException) {
              // The provider still receives the bytes when the descriptor closes.
            }
          }
        }
        return
      }
    } catch (error: DriveWriteException) {
      throw error
    } catch (_: Exception) {
      // Some Drive versions only accept a stream.
    }

    val stream = resolver.openOutputStream(destination) ?: throw DriveWriteException()
    stream.use { output ->
      val copied = source.inputStream().use { input -> input.copyTo(output, COPY_BUFFER) }
      if (copied != expected) throw DriveWriteException()
      output.flush()
    }
  }

  private fun deleteQuietly(uri: Uri) {
    try {
      DocumentsContract.deleteDocument(context.contentResolver, uri)
    } catch (_: Exception) {
      // Removed when the provider allows it.
    }
  }

  private companion object {
    val DRIVE_AUTHORITIES = listOf(
      "com.google.android.apps.docs.storage",
      "com.google.android.apps.docs.storage.legacy"
    )
    const val COPY_BUFFER = 1024 * 1024
  }
}

private fun sourceFile(path: String): File {
  val raw = if (path.startsWith("file:")) Uri.parse(path).path ?: path else path
  return File(raw)
}

private fun safeFileName(fileName: String): String {
  val name = fileName.substringAfterLast('/').substringAfterLast('\\').trim()
  return if (name.endsWith(".zip")) name else "tradesreport-backup.zip"
}

internal class DriveAppMissingException :
  CodedException("Install the Google Drive app. ERR_DRIVE_APP_MISSING")

internal class DriveNotSelectedException :
  CodedException("Choose a folder in Google Drive. ERR_DRIVE_NOT_SELECTED")

internal class DriveWriteException(cause: Throwable? = null) :
  CodedException("Could not write the backup to Google Drive. ERR_DRIVE_WRITE", cause)

internal data class CreateDocumentOptions(
  val fileName: String,
  val initialUri: String?
) : Serializable

internal sealed class CreateDocumentResult {
  class Success(val uri: Uri) : CreateDocumentResult()
  object Cancelled : CreateDocumentResult()
  object Failed : CreateDocumentResult()
}

internal class CreateDocumentContract :
  AppContextActivityResultContract<CreateDocumentOptions, CreateDocumentResult> {
  override fun createIntent(context: android.content.Context, input: CreateDocumentOptions): Intent {
    return Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = "application/zip"
      putExtra(Intent.EXTRA_TITLE, input.fileName)
      val initial = input.initialUri
      if (!initial.isNullOrBlank() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse(initial))
      }
    }
  }

  override fun parseResult(
    input: CreateDocumentOptions,
    resultCode: Int,
    intent: Intent?
  ): CreateDocumentResult {
    if (resultCode == Activity.RESULT_CANCELED) return CreateDocumentResult.Cancelled
    val uri = intent?.data
    if (resultCode != Activity.RESULT_OK || uri == null) return CreateDocumentResult.Failed
    return CreateDocumentResult.Success(uri)
  }
}
