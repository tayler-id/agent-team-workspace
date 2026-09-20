import Foundation

// Harness revision: the Swift consumer starts, reads the vectors and reports every one unavailable until a contract is generated.
struct Vector: Decodable { let id: String }
struct VectorFile: Decodable { let schema_version: String; let vectors: [Vector] }

let arguments = CommandLine.arguments
guard arguments.count == 3 else {
	FileHandle.standardError.write(Data("usage: agora-contracts-conform <vectors.json> <openapi.bundled.json>\n".utf8))
	exit(64)
}
let file = try JSONDecoder().decode(VectorFile.self, from: Data(contentsOf: URL(fileURLWithPath: arguments[1])))
let vectors: [[String: Any]] = file.vectors.map { ["id": $0.id, "accepted": false, "rejection": "unavailable: no generated contract"] }
let report: [String: Any] = ["schema_version": "agora.contract-conformance/v1", "consumer": "swift", "vectors": vectors]
FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys]))
FileHandle.standardOutput.write(Data("\n".utf8))
