import Foundation
import PDFKit

guard CommandLine.arguments.count == 2 else {
    FileHandle.standardError.write(
        Data("Usage: swift scripts/extract-pdf-text.swift <pdf>\n".utf8)
    )
    exit(2)
}

let source = URL(fileURLWithPath: CommandLine.arguments[1])
guard let document = PDFDocument(url: source) else {
    FileHandle.standardError.write(
        Data("Could not open \(source.path)\n".utf8)
    )
    exit(1)
}

for pageIndex in 0..<document.pageCount {
    guard let page = document.page(at: pageIndex), let text = page.string else {
        continue
    }
    print("=== PAGE \(pageIndex + 1) ===")
    print(text)
}
