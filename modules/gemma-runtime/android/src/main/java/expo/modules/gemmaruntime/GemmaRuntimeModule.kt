package expo.modules.gemmaruntime

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.IOException
import java.util.Locale

class GemmaRuntimeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("GemmaRuntime")

    AsyncFunction("ensureBundledModelInstalled") {
        modelId: String,
        bundledAssetPath: String,
        deviceModelPath: String ->
      installPayload(modelId, bundledAssetPath, deviceModelPath)
    }

    AsyncFunction("getStatus") {
        modelId: String,
        bundledAssetPath: String,
        deviceModelPath: String,
        requirements: Map<String, Any?> ->
      statusPayload(modelId, bundledAssetPath, deviceModelPath, requirements)
    }
  }

  private fun installPayload(
    modelId: String,
    bundledAssetPath: String,
    deviceModelPath: String
  ): Map<String, Any?> {
    val installation = ensureBundledModelInstalled(modelId, bundledAssetPath, deviceModelPath)
    return mapOf(
      "code" to installation.code,
      "message" to installation.message,
      "bundledAssetPresent" to installation.bundledAssetPresent,
      "deviceModelPresent" to installation.deviceModelPresent,
      "bytesCopied" to installation.bytesCopied
    )
  }

  private fun statusPayload(
    modelId: String,
    bundledAssetPath: String,
    deviceModelPath: String,
    requirements: Map<String, Any?>
  ): Map<String, Any?> {
    val status = inspectStatus(modelId, bundledAssetPath, deviceModelPath, requirements)
    return mapOf(
      "code" to status.code,
      "message" to status.message,
      "bundledAssetPresent" to status.bundledAssetPresent,
      "deviceModelPresent" to status.deviceModelPresent,
      "deviceProfile" to status.deviceProfile?.toPayload()
    )
  }

  private fun ensureBundledModelInstalled(
    modelId: String,
    bundledAssetPath: String,
    deviceModelPath: String
  ): NativeInstallResult {
    val modelFile = resolveModelFile(deviceModelPath)
    val bundledAssetPresent = hasBundledAsset(bundledAssetPath)

    if (modelId != supportedModelId) {
      return NativeInstallResult(
        code = "install_failed",
        message = "Unsupported model id $modelId. Only $supportedModelId is supported.",
        bundledAssetPresent = bundledAssetPresent,
        deviceModelPresent = modelFile.exists(),
        bytesCopied = null
      )
    }

    if (modelFile.exists() && matchesExpectedArtifactSignature(modelFile)) {
      return NativeInstallResult(
        code = "already_available",
        message = "The packaged Gemma model is already installed in app storage.",
        bundledAssetPresent = bundledAssetPresent,
        deviceModelPresent = true,
        bytesCopied = null
      )
    }

    if (!bundledAssetPresent) {
      return NativeInstallResult(
        code = "bundled_asset_missing",
        message = "This Android build does not contain a bundled Gemma model asset.",
        bundledAssetPresent = false,
        deviceModelPresent = modelFile.exists(),
        bytesCopied = null
      )
    }

    return try {
      val bytesCopied = installBundledAsset(bundledAssetPath, modelFile)
      if (!matchesExpectedArtifactSignature(modelFile)) {
        modelFile.delete()
        NativeInstallResult(
          code = "install_failed",
          message = "The bundled Gemma model asset was copied, but the installed GGUF file signature is invalid.",
          bundledAssetPresent = true,
          deviceModelPresent = false,
          bytesCopied = bytesCopied
        )
      } else {
        NativeInstallResult(
          code = "installed",
          message = "Installed the bundled Gemma model into app-private storage.",
          bundledAssetPresent = true,
          deviceModelPresent = true,
          bytesCopied = bytesCopied
        )
      }
    } catch (error: Exception) {
      modelFile.delete()
      NativeInstallResult(
        code = "install_failed",
        message = "Failed to install the bundled Gemma model: ${error.message ?: "unknown error"}",
        bundledAssetPresent = true,
        deviceModelPresent = false,
        bytesCopied = null
      )
    }
  }

  private fun inspectStatus(
    modelId: String,
    bundledAssetPath: String,
    deviceModelPath: String,
    requirementPayload: Map<String, Any?>
  ): NativeStatus {
    val requirements = parseRequirements(requirementPayload)
    val deviceProfile = readDeviceProfile()
    val modelFile = resolveModelFile(deviceModelPath)
    val deviceModelPresent = modelFile.exists()
    val bundledAssetPresent = hasBundledAsset(bundledAssetPath)

    if (modelId != supportedModelId) {
      return NativeStatus(
        code = "runtime_error",
        message = "Unsupported model id $modelId. Only $supportedModelId is supported.",
        bundledAssetPresent = bundledAssetPresent,
        deviceModelPresent = deviceModelPresent,
        deviceProfile = deviceProfile
      )
    }

    if (deviceProfile.isEmulator == true && !requirements.allowEmulator) {
      return NativeStatus(
        code = "emulator_not_supported",
        message = "Gemma warmup is disabled on Android emulators. Use the emulator for UI smoke tests and a physical arm64 phone for local inference.",
        bundledAssetPresent = bundledAssetPresent,
        deviceModelPresent = deviceModelPresent,
        deviceProfile = deviceProfile
      )
    }

    if (!supportsRequiredAbi(requirements.supportedAbis)) {
      val requiredAbis = requirements.supportedAbis.joinToString(", ")
      val detectedAbi = deviceProfile.supportedAbi ?: "unknown"
      return NativeStatus(
        code = "unsupported_platform",
        message = "Gemma local inference requires one of [$requiredAbis]. Detected ABI: $detectedAbi.",
        bundledAssetPresent = bundledAssetPresent,
        deviceModelPresent = deviceModelPresent,
        deviceProfile = deviceProfile
      )
    }

    if (requirements.minTotalMemoryBytes > 0L &&
      deviceProfile.totalMemoryBytes != null &&
      deviceProfile.totalMemoryBytes < requirements.minTotalMemoryBytes) {
      val detectedGb = bytesToGibString(deviceProfile.totalMemoryBytes)
      val requiredGb = bytesToGibString(requirements.minTotalMemoryBytes)
      return NativeStatus(
        code = "insufficient_memory",
        message = "Gemma local inference is targeting phones with at least $requiredGb total RAM. This device reports about $detectedGb total RAM.",
        bundledAssetPresent = bundledAssetPresent,
        deviceModelPresent = deviceModelPresent,
        deviceProfile = deviceProfile
      )
    }

    if (!modelFile.exists()) {
      return NativeStatus(
        code = "device_model_missing",
        message =
          if (bundledAssetPresent) {
            "The packaged Gemma model asset is available, but no installed device copy was found in app storage."
          } else {
            "No local Gemma model is installed on this device. In development, run npm run model:stage:android. For standalone builds, install a build that bundles the model."
          },
        bundledAssetPresent = bundledAssetPresent,
        deviceModelPresent = false,
        deviceProfile = deviceProfile
      )
    }

    val supportedExtension =
      modelFile.name.lowercase(Locale.US).endsWith(".gguf")

    if (!supportedExtension || modelFile.length() <= 0L) {
      return NativeStatus(
        code = "artifact_invalid",
        message = "The installed Android Gemma artifact is invalid. Expected a non-empty .gguf file.",
        bundledAssetPresent = bundledAssetPresent,
        deviceModelPresent = true,
        deviceProfile = deviceProfile
      )
    }

    if (!matchesExpectedArtifactSignature(modelFile)) {
      return NativeStatus(
        code = "artifact_incompatible",
        message = "The installed Android Gemma artifact does not match the expected GGUF file signature.",
        bundledAssetPresent = bundledAssetPresent,
        deviceModelPresent = true,
        deviceProfile = deviceProfile
      )
    }

    return NativeStatus(
      code = "ready",
      message = "The local Gemma model is installed and available on the Android device.",
      bundledAssetPresent = bundledAssetPresent,
      deviceModelPresent = true,
      deviceProfile = deviceProfile
    )
  }

  private fun resolveModelFile(deviceModelPath: String): File {
    val reactContext = requireReactContext()
    val normalizedPath = deviceModelPath.removePrefix("/").replace("\\", "/")
    return File(reactContext.filesDir, normalizedPath)
  }

  private fun requireReactContext() =
    appContext.reactContext ?: throw IllegalStateException("React context is not available.")

  private fun hasBundledAsset(assetPath: String): Boolean {
    val reactContext = requireReactContext()
    return try {
      reactContext.assets.open(assetPath).use { stream ->
        stream.read() >= 0
      }
    } catch (_error: IOException) {
      false
    }
  }

  private fun installBundledAsset(assetPath: String, destination: File): Long {
    val reactContext = requireReactContext()
    val parent = destination.parentFile
      ?: throw IllegalStateException("The destination directory for the Gemma model is invalid.")
    if (!parent.exists() && !parent.mkdirs()) {
      throw IOException("Failed to create the destination directory for the Gemma model.")
    }

    val tempFile = File(parent, "${destination.name}.tmp")
    if (tempFile.exists()) {
      tempFile.delete()
    }

    val bytesCopied = reactContext.assets.open(assetPath).use { input ->
      tempFile.outputStream().use { output ->
        input.copyTo(output, 8 * 1024 * 1024)
      }
    }

    if (destination.exists() && !destination.delete()) {
      tempFile.delete()
      throw IOException("Failed to replace the existing Gemma model copy in app storage.")
    }

    if (!tempFile.renameTo(destination)) {
      tempFile.delete()
      throw IOException("Failed to finalize the packaged Gemma model install.")
    }

    return bytesCopied
  }

  private fun parseRequirements(payload: Map<String, Any?>): RuntimeRequirements {
    val supportedAbis = (payload["supportedAbis"] as? List<*>)
      ?.mapNotNull { value -> value?.toString() }
      ?.ifEmpty { null }
      ?: defaultSupportedAbis

    return RuntimeRequirements(
      allowEmulator = payload["allowEmulator"] as? Boolean ?: defaultAllowEmulator,
      minTotalMemoryBytes = (payload["minTotalMemoryBytes"] as? Number)?.toLong()
        ?: defaultMinTotalMemoryBytes,
      supportedAbis = supportedAbis,
      maxContextTokens = (payload["maxContextTokens"] as? Number)?.toInt()
        ?: defaultMaxContextTokens
    )
  }

  private fun readDeviceProfile(): DeviceProfile {
    val reactContext = requireReactContext()
    val activityManager =
      reactContext.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
    val memoryInfo = ActivityManager.MemoryInfo()
    activityManager?.getMemoryInfo(memoryInfo)

    return DeviceProfile(
      isEmulator = isProbablyEmulator(),
      totalMemoryBytes = memoryInfo.totalMem.takeIf { it > 0L },
      availableMemoryBytes = memoryInfo.availMem.takeIf { it > 0L },
      supportedAbi = detectSupportedAbi()
    )
  }

  private fun detectSupportedAbi(): String? =
    Build.SUPPORTED_ABIS.firstOrNull()?.takeIf { value -> value.isNotBlank() }

  private fun supportsRequiredAbi(requiredAbis: List<String>): Boolean =
    Build.SUPPORTED_ABIS.any { detectedAbi ->
      requiredAbis.any { candidate -> candidate.equals(detectedAbi, ignoreCase = true) }
    }

  private fun isProbablyEmulator(): Boolean {
    val fingerprint = Build.FINGERPRINT.lowercase(Locale.US)
    val model = Build.MODEL.lowercase(Locale.US)
    val manufacturer = Build.MANUFACTURER.lowercase(Locale.US)
    val brand = Build.BRAND.lowercase(Locale.US)
    val device = Build.DEVICE.lowercase(Locale.US)
    val product = Build.PRODUCT.lowercase(Locale.US)
    val hardware = Build.HARDWARE.lowercase(Locale.US)

    return fingerprint.contains("generic") ||
      fingerprint.contains("emulator") ||
      model.contains("sdk") ||
      model.contains("emulator") ||
      model.contains("android sdk built for") ||
      manufacturer.contains("genymotion") ||
      brand.startsWith("generic") ||
      device.startsWith("generic") ||
      product.contains("sdk") ||
      product.contains("emulator") ||
      hardware.contains("goldfish") ||
      hardware.contains("ranchu")
  }

  private fun matchesExpectedArtifactSignature(modelFile: File): Boolean {
    return modelFile.inputStream().use { stream ->
      val header = ByteArray(4)
      val bytesRead = stream.read(header)
      if (bytesRead < 4) {
        return@use false
      }

      val signature = String(header, 0, bytesRead, Charsets.US_ASCII)
      signature == "GGUF"
    }
  }

  private fun bytesToGibString(bytes: Long): String {
    val gib = bytes.toDouble() / (1024.0 * 1024.0 * 1024.0)
    return String.format(Locale.US, "%.1f GB", gib)
  }

  data class NativeStatus(
    val code: String,
    val message: String,
    val bundledAssetPresent: Boolean,
    val deviceModelPresent: Boolean,
    val deviceProfile: DeviceProfile? = null
  )

  data class NativeInstallResult(
    val code: String,
    val message: String,
    val bundledAssetPresent: Boolean,
    val deviceModelPresent: Boolean,
    val bytesCopied: Long?
  )

  data class DeviceProfile(
    val isEmulator: Boolean?,
    val totalMemoryBytes: Long?,
    val availableMemoryBytes: Long?,
    val supportedAbi: String?
  ) {
    fun toPayload(): Map<String, Any?> = mapOf(
      "isEmulator" to isEmulator,
      "totalMemoryBytes" to totalMemoryBytes,
      "availableMemoryBytes" to availableMemoryBytes,
      "supportedAbi" to supportedAbi
    )
  }

  data class RuntimeRequirements(
    val allowEmulator: Boolean,
    val minTotalMemoryBytes: Long,
    val supportedAbis: List<String>,
    val maxContextTokens: Int
  )

  companion object {
    private const val supportedModelId = "google/gemma-4-E2B-it"
    private const val defaultMaxContextTokens = 512
    private const val defaultMinTotalMemoryBytes = 0L
    private const val defaultAllowEmulator = false

    private val defaultSupportedAbis = listOf("arm64-v8a")
  }
}
