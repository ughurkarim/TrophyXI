import CoreImage
import CoreVideo
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

enum IsolationError: Error, CustomStringConvertible {
    case invalidArguments
    case unreadableImage(String)
    case noPerson(String)
    case renderFailed(String)

    var description: String {
        switch self {
        case .invalidArguments:
            return "Usage: swift scripts/isolate-manager-portraits.swift <source-directory> <output-directory>"
        case .unreadableImage(let file):
            return "\(file): source image could not be decoded"
        case .noPerson(let file):
            return "\(file): Vision did not return a person mask"
        case .renderFailed(let file):
            return "\(file): isolated PNG could not be rendered"
        }
    }
}

let context = CIContext(options: [
    .cacheIntermediates: false,
    .useSoftwareRenderer: false,
])

func decodedImage(at url: URL) throws -> CGImage {
    guard
        let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil)
            as? [CFString: Any]
    else {
        throw IsolationError.unreadableImage(url.lastPathComponent)
    }
    let width = properties[kCGImagePropertyPixelWidth] as? Int ?? 0
    let height = properties[kCGImagePropertyPixelHeight] as? Int ?? 0
    let maximumDimension = max(width, height, 1)
    let options: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maximumDimension,
        kCGImageSourceShouldCacheImmediately: true,
    ]
    guard let image = CGImageSourceCreateThumbnailAtIndex(
        source,
        0,
        options as CFDictionary
    ) else {
        throw IsolationError.unreadableImage(url.lastPathComponent)
    }
    return image
}

func isolatePerson(from sourceUrl: URL, to outputUrl: URL) throws {
    let sourceImage = try decodedImage(at: sourceUrl)
    let request = VNGeneratePersonSegmentationRequest()
    request.qualityLevel = .accurate
    request.outputPixelFormat = kCVPixelFormatType_OneComponent8
    let handler = VNImageRequestHandler(cgImage: sourceImage, options: [:])
    try handler.perform([request])
    guard let observation = request.results?.first else {
        throw IsolationError.noPerson(sourceUrl.lastPathComponent)
    }

    let foreground = CIImage(cgImage: sourceImage)
    let rawMask = CIImage(cvPixelBuffer: observation.pixelBuffer)
    let scaledMask = rawMask
        .transformed(
            by: CGAffineTransform(
                scaleX: foreground.extent.width / rawMask.extent.width,
                y: foreground.extent.height / rawMask.extent.height
            )
        )
        .applyingFilter(
            "CIMorphologyMinimum",
            parameters: [kCIInputRadiusKey: 0.65]
        )
        .applyingFilter(
            "CIGaussianBlur",
            parameters: [kCIInputRadiusKey: 0.35]
        )
        .cropped(to: foreground.extent)
    let transparent = CIImage(
        color: CIColor(red: 0, green: 0, blue: 0, alpha: 0)
    ).cropped(to: foreground.extent)
    let isolated = foreground
        .applyingFilter(
            "CIBlendWithMask",
            parameters: [
                kCIInputBackgroundImageKey: transparent,
                kCIInputMaskImageKey: scaledMask,
            ]
        )
        .cropped(to: foreground.extent)

    try FileManager.default.createDirectory(
        at: outputUrl.deletingLastPathComponent(),
        withIntermediateDirectories: true
    )
    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else {
        throw IsolationError.renderFailed(sourceUrl.lastPathComponent)
    }
    do {
        try context.writePNGRepresentation(
            of: isolated,
            to: outputUrl,
            format: .RGBA8,
            colorSpace: colorSpace
        )
    } catch {
        throw IsolationError.renderFailed(sourceUrl.lastPathComponent)
    }
}

do {
    guard CommandLine.arguments.count == 3 else {
        throw IsolationError.invalidArguments
    }
    let sourceDirectory = URL(
        fileURLWithPath: CommandLine.arguments[1],
        isDirectory: true
    )
    let outputDirectory = URL(
        fileURLWithPath: CommandLine.arguments[2],
        isDirectory: true
    )
    let files = try FileManager.default.contentsOfDirectory(
        at: sourceDirectory,
        includingPropertiesForKeys: nil
    )
    .filter { ["jpg", "jpeg", "png"].contains($0.pathExtension.lowercased()) }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }

    for source in files {
        let output = outputDirectory
            .appendingPathComponent(source.deletingPathExtension().lastPathComponent)
            .appendingPathExtension("png")
        try isolatePerson(from: source, to: output)
        print("Isolated \(source.lastPathComponent)")
    }
} catch {
    FileHandle.standardError.write(
        Data("\(error)\n".utf8)
    )
    exit(1)
}
