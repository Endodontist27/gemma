package expo.modules.pdftextextractor

import android.net.Uri
import android.util.Log
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PdfTextExtractorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PdfTextExtractor")

    AsyncFunction("extractText") { uriString: String ->
      extractText(uriString)
    }
  }

  private fun extractText(uriString: String): String {
    Log.d(LOG_TAG, "Starting PDF extraction for uri=$uriString")
    val reactContext =
      appContext.reactContext ?: throw IllegalStateException("React context is not available.")

    PDFBoxResourceLoader.init(reactContext.applicationContext)

    return try {
      val uri = Uri.parse(uriString)
      val contentResolver = reactContext.contentResolver
      val extractedText = contentResolver.openInputStream(uri)?.use { inputStream ->
        PDDocument.load(inputStream).use { document ->
          val stripper = PDFTextStripper().apply {
            sortByPosition = true
            lineSeparator = "\n"
          }

          stripper.getText(document)
        }
      } ?: throw IllegalArgumentException("Could not open the selected PDF.")

      val normalized = extractedText.replace("\u0000", "").trim()
      if (normalized.isEmpty()) {
        throw IllegalStateException(
          "The selected PDF does not appear to contain extractable text. If it is a scanned PDF, run OCR before importing it."
        )
      }

      Log.d(LOG_TAG, "Completed PDF extraction for uri=$uriString length=${normalized.length}")
      normalized
    } catch (error: Throwable) {
      Log.e(LOG_TAG, "PDF extraction failed for uri=$uriString", error)
      throw error
    }
  }

  companion object {
    private const val LOG_TAG = "PdfTextExtractor"
  }
}
