import ExpoModulesCore
import Foundation

/**
 On-device voice → form-field rewrite via Apple's Foundation Models (`SystemLanguageModel`).
 Uses the on-device system model only — never Private Cloud Compute.

 Compiles on older Xcode toolchains via `canImport(FoundationModels)`.
 When the framework is missing, every call reports `unsupported`.
 */
public class AppleFoundationModelsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleFoundationModels")

    AsyncFunction("getAvailability") { () -> [String: String] in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        return AppleFoundationModelsRuntime.availability()
      }
      #endif
      return [
        "status": "unsupported",
        "reason": "Apple Foundation Models require a supported iOS version and Apple Intelligence.",
      ]
    }

    AsyncFunction("rewrite") { (transcript: String) -> [String: String] in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        return try await AppleFoundationModelsRuntime.rewrite(transcript: transcript)
      }
      #endif
      throw Exception(name: "AIUnavailable", description: "On-device Apple language model is not available on this device.")
    }
  }
}

#if canImport(FoundationModels)
import FoundationModels

@available(iOS 26.0, *)
enum AppleFoundationModelsRuntime {
  static func availability() -> [String: String] {
    let model = SystemLanguageModel.default
    switch model.availability {
    case .available:
      return ["status": "available", "engine": "apple_foundation"]
    case .unavailable(.deviceNotEligible):
      return ["status": "unsupported", "reason": "This device does not support Apple Intelligence."]
    case .unavailable(.appleIntelligenceNotEnabled):
      return ["status": "unavailable", "reason": "Turn on Apple Intelligence in Settings to use professional rewriting."]
    case .unavailable(.modelNotReady):
      return ["status": "installing", "reason": "The on-device language model is still installing."]
    default:
      return ["status": "unavailable", "reason": "The on-device language model is not available."]
    }
  }

  static func rewrite(transcript: String) async throws -> [String: String] {
    let model = SystemLanguageModel.default
    guard case .available = model.availability else {
      throw Exception(name: "AIUnavailable", description: "On-device Apple language model is not available.")
    }

    // Keep in sync with services/voiceReport/onDeviceAI/prompts.ts
    let instructions = """
    You turn messy spoken UK trades job notes into polished Trade Report form fields.
    Remove fillers (um, uh, you know, like, then). Use clear professional British English.
    Do not invent facts.

    Fields:
    - workCompleted: polished customer-facing Summary of the work. Example: "um I did a carpentry job for a client" → "Carpentry job for a client."
    - materials: named materials/parts only, one item per line. If they say "materials used" but name no items, leave EMPTY.
    - labour: real labour/time-on-site detail only. Vague waffle with no detail → EMPTY.
    - privateNotes: private asides, reminders, unpaid, door codes. Empty if none.
    - pricingLines: one row per spoken money amount (quid/pounds/£). Convert number words to digits. Never invent amounts.

    Preserve uncertainty. Never change needs checking into checked.
    Never invent work, materials, prices, tests, certifications, or client approvals.
    """

    let session = LanguageModelSession(model: model, instructions: instructions)
    let prompt = """
    Sort this raw speech into Summary (workCompleted), Materials, Labour, Private notes, and Costs (pricingLines).
    Strip fillers. Polish wording. Do not invent materials or prices.

    Speech:
    \(transcript)
    """
    let response = try await session.respond(to: prompt, generating: TradeReportDraft.self)
    let draft = response.content

    let pricingJson: String
    if draft.pricingLines.isEmpty {
      pricingJson = "[]"
    } else {
      let rows = draft.pricingLines.map { line -> [String: String] in
        [
          "description": line.description,
          "category": line.category,
          "amount": line.amount,
        ]
      }
      let data = try JSONSerialization.data(withJSONObject: rows, options: [])
      pricingJson = String(data: data, encoding: .utf8) ?? "[]"
    }

    return [
      "workCompleted": draft.workCompleted,
      "materials": draft.materials,
      "labour": draft.labour,
      "privateNotes": draft.privateNotes,
      "pricingLinesJson": pricingJson,
      "source": "on_device_ai",
    ]
  }
}

@available(iOS 26.0, *)
@Generable
struct TradeReportDraft {
  @Guide(description: "Polished Summary of work done. Strip fillers like 'um' and 'I did a'. Empty if none.")
  var workCompleted: String = ""

  @Guide(description: "Named materials only, one item per line. Leave empty if speaker said 'materials used' but named no items.")
  var materials: String = ""

  @Guide(description: "Labour or time-on-site details. Leave empty if only vague waffle with no real detail.")
  var labour: String = ""

  @Guide(description: "Private notes not for the customer report. Empty if none.")
  var privateNotes: String = ""

  @Guide(description: "Every spoken money amount. Empty list when no amount was said. Never invent prices.")
  var pricingLines: [TradeReportPriceLine] = []
}

@available(iOS 26.0, *)
@Generable
struct TradeReportPriceLine {
  @Guide(description: "Short cost label from nearby speech, e.g. Timber, Brackets, Job cost.")
  var description: String = ""

  @Guide(description: "Exactly one of: materials, labour, other.")
  var category: String = "other"

  @Guide(description: "Pounds as digits only, e.g. 250 or 80. Convert 'eighty' to 80.")
  var amount: String = ""
}
#endif
