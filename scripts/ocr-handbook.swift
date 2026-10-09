// Local macOS Vision OCR. Writes draft text only; it cannot mark policies reviewed.
import Foundation
import Vision
import ImageIO
import CryptoKit

guard CommandLine.arguments.count == 3 else {
    fputs("Usage: swift scripts/ocr-handbook.swift /path/to/png-folder /path/to/review-folder\n", stderr)
    exit(1)
}
let input = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let output = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
let manager = FileManager.default
try manager.createDirectory(at: output, withIntermediateDirectories: true)
let files = try manager.contentsOfDirectory(at: input, includingPropertiesForKeys: nil)
    .filter { ["png", "jpg", "jpeg"].contains($0.pathExtension.lowercased()) && $0.lastPathComponent != "laguna-college-seal.png" }
    .sorted { $0.lastPathComponent.localizedStandardCompare($1.lastPathComponent) == .orderedAscending }
for file in files {
    let destination = output.appendingPathComponent(file.lastPathComponent + ".json")
    if manager.fileExists(atPath: destination.path) { print("Preserved existing review: \(destination.lastPathComponent)"); continue }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["en-US"]
    try VNImageRequestHandler(url: file).perform([request])
    let observations = (request.results ?? []).sorted {
        if abs($0.boundingBox.maxY - $1.boundingBox.maxY) < 0.005 { return $0.boundingBox.minX < $1.boundingBox.minX }
        return $0.boundingBox.maxY > $1.boundingBox.maxY
    }
    // Keep lines separate for review. Merge paragraph lines in the review JSON
    // before verified:true, using the union of their bounding boxes.
    let passages: [[String: Any]] = observations.compactMap { observation in
        guard let candidate = observation.topCandidates(1).first else { return nil }
        let b = observation.boundingBox.intersection(CGRect(x: 0, y: 0, width: 1, height: 1))
        guard !b.isNull && b.width > 0 && b.height > 0 else { return nil }
        return ["text": candidate.string, "verified": false, "confidence": candidate.confidence,
                "box": ["x": b.minX, "y": 1 - b.maxY, "width": b.width, "height": b.height]]
    }
    let data = try Data(contentsOf: file)
    let hash = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    let result: [String: Any] = ["imageSha256": hash, "file": file.lastPathComponent, "passages": passages]
    try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys]).write(to: destination)
    print("\(file.lastPathComponent): \(passages.count) draft lines")
}
