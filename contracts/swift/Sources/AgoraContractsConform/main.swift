import AgoraContracts
import CryptoKit
import Foundation

// Swift conformance consumer. Reads the golden vectors and the bundled OpenAPI document, and for every
// vector reports acceptance (schema validation plus generated-type decoding), the canonical bytes and
// digest of the value re-encoded from the generated type, and the detached Ed25519 verdict where given.
// Usage: agora-contracts-conform <contracts/fixtures/vectors.json> <contracts/generated/openapi.bundled.json>

struct Signature: Decodable { let algorithm: String; let public_key: String; let signature: String; let valid: Bool }
struct Vector: Decodable { let id: String; let component: String; let wire: String; let expect: String; let signature: Signature? }
struct VectorFile: Decodable { let schema_version: String; let vectors: [Vector] }

let arguments = CommandLine.arguments
guard arguments.count == 3 else {
	FileHandle.standardError.write(Data("usage: agora-contracts-conform <vectors.json> <openapi.bundled.json>\n".utf8))
	exit(64)
}
let file = try JSONDecoder().decode(VectorFile.self, from: Data(contentsOf: URL(fileURLWithPath: arguments[1])))
guard file.schema_version == "agora.contract-vectors/v1" else { FileHandle.standardError.write(Data("unsupported vector file\n".utf8)); exit(64) }
let bundle = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: arguments[2]))) as? [String: Any] ?? [:]
let validator = SchemaValidator(components: (bundle["components"] as? [String: Any])?["schemas"] as? [String: Any] ?? [:])

let decoder = JSONDecoder()
let encoder = JSONEncoder()
func roundTrip<T: Codable>(_: T.Type) -> (Data) throws -> Data { { data in try encoder.encode(try decoder.decode(T.self, from: data)) } }
typealias Schemas = Components.Schemas
let generated: [String: (Data) throws -> Data] = [
	"ArtifactReference": roundTrip(Schemas.ArtifactReference.self),
	"CleanupReceipt": roundTrip(Schemas.CleanupReceipt.self),
	"CommandReceipt": roundTrip(Schemas.CommandReceipt.self),
	"CliCommand": roundTrip(Schemas.CliCommand.self),
	"CommandIdentity": roundTrip(Schemas.CommandIdentity.self),
	"CliCommandName": roundTrip(Schemas.CliCommandName.self),
	"CliOutcome": roundTrip(Schemas.CliOutcome.self),
	"CliReport": roundTrip(Schemas.CliReport.self),
	"CliInstance": roundTrip(Schemas.CliInstance.self),
	"FixtureLane": roundTrip(Schemas.FixtureLane.self),
	"ProjectFixtureConfig": roundTrip(Schemas.ProjectFixtureConfig.self),
	"FixtureEffect": roundTrip(Schemas.FixtureEffect.self),
	"FixtureEffects": roundTrip(Schemas.FixtureEffects.self),
	"Diagnostic": roundTrip(Schemas.Diagnostic.self),
	"Digest": roundTrip(Schemas.Digest.self),
	"ErrorReport": roundTrip(Schemas.ErrorReport.self),
	"ExitCode": roundTrip(Schemas.ExitCode.self),
	"FixturePolicyCommand": roundTrip(Schemas.FixturePolicyCommand.self),
	"FixturePolicyDecisionReport": roundTrip(Schemas.FixturePolicyDecisionReport.self),
	"FixtureSyncMessage": roundTrip(Schemas.FixtureSyncMessage.self),
	"FixtureSyncTombstone": roundTrip(Schemas.FixtureSyncTombstone.self),
	"FixtureSyncRunCard": roundTrip(Schemas.FixtureSyncRunCard.self),
	"FixtureSyncState": roundTrip(Schemas.FixtureSyncState.self),
	"FixtureSyncSnapshot": roundTrip(Schemas.FixtureSyncSnapshot.self),
	"FixtureSyncMessageEvent": roundTrip(Schemas.FixtureSyncMessageEvent.self),
	"FixtureSyncTombstoneEvent": roundTrip(Schemas.FixtureSyncTombstoneEvent.self),
	"FixtureSyncRunCardEvent": roundTrip(Schemas.FixtureSyncRunCardEvent.self),
	"FoundationProof": roundTrip(Schemas.FoundationProof.self),
	"FoundationReport": roundTrip(Schemas.FoundationReport.self),
	"GitSha": roundTrip(Schemas.GitSha.self),
	"HealthReport": roundTrip(Schemas.HealthReport.self),
	"LocalRoomScope": roundTrip(Schemas.LocalRoomScope.self),
	"ReadinessReport": roundTrip(Schemas.ReadinessReport.self),
	"ReasonCode": roundTrip(Schemas.ReasonCode.self),
	"RecordCitation": roundTrip(Schemas.RecordCitation.self),
	"Revision": roundTrip(Schemas.Revision.self),
	"RoomAuthor": roundTrip(Schemas.RoomAuthor.self),
	"RoomCommandReceipt": roundTrip(Schemas.RoomCommandReceipt.self),
	"RoomMessage": roundTrip(Schemas.RoomMessage.self),
	"RoomMessageBody": roundTrip(Schemas.RoomMessageBody.self),
	"RoomMessageCreatedEvent": roundTrip(Schemas.RoomMessageCreatedEvent.self),
	"RoomSnapshot": roundTrip(Schemas.RoomSnapshot.self),
	"RoomEventBatch": roundTrip(Schemas.RoomEventBatch.self),
	"LocalRuntimeReport": roundTrip(Schemas.LocalRuntimeReport.self),
	"ScopeReference": roundTrip(Schemas.ScopeReference.self),
	"SendRoomMessageCommand": roundTrip(Schemas.SendRoomMessageCommand.self),
	"LocalAnswerCommand": roundTrip(Schemas.LocalAnswerCommand.self),
	"Timestamp": roundTrip(Schemas.Timestamp.self),
	"StreamCursor": roundTrip(Schemas.StreamCursor.self),
	"Uuid": roundTrip(Schemas.Uuid.self),
]

func hexBytes(_ hex: String) -> Data {
	var data = Data()
	var digits = hex.unicodeScalars.makeIterator()
	while let high = digits.next(), let low = digits.next(), let byte = UInt8(String(high) + String(low), radix: 16) { data.append(byte) }
	return data
}

var results: [[String: Any]] = []
for vector in file.vectors {
	var result: [String: Any] = ["id": vector.id, "accepted": false]
	defer { results.append(result) }
	let wire = Data(vector.wire.utf8)
	// Schema validation and generated-type decoding run independently so the report shows what each layer refuses.
	guard let decode = generated[vector.component] else { result["rejection"] = "unavailable: no generated type registered for \(vector.component)"; continue }
	var reencoded: Data?
	do { reencoded = try decode(wire); result["generated_decode"] = "ok" } catch { result["generated_decode"] = "refused: \(error)" }
	guard let parsed = try? JSONSerialization.jsonObject(with: wire, options: [.fragmentsAllowed]) else { result["rejection"] = "not json"; continue }
	if let violation = validator.validate(parsed, component: vector.component) { result["rejection"] = violation; continue }
	guard let reencoded else { result["rejection"] = result["generated_decode"] as? String ?? "refused"; continue }
	do {
		let value = try JSONSerialization.jsonObject(with: reencoded, options: [.fragmentsAllowed])
		let canonical = try Canonical.json(value)
		result["accepted"] = true
		result["canonical"] = canonical
		result["digest"] = "sha256:" + SHA256.hash(data: Data(canonical.utf8)).map { String(format: "%02x", $0) }.joined()
		if let signature = vector.signature {
			let key = try Curve25519.Signing.PublicKey(rawRepresentation: hexBytes(signature.public_key))
			result["signature"] = key.isValidSignature(hexBytes(signature.signature), for: Data(canonical.utf8)) ? "valid" : "invalid"
		}
	} catch { result["rejection"] = "\(error)" }
}
var report: [String: Any] = ["schema_version": "agora.contract-conformance/v1", "consumer": "swift", "vectors": results]
let fixtureFile = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: arguments[1]))) as? [String: Any]
if let replays = fixtureFile?["replays"] as? [[String: Any]] { report["replays"] = try replayFixtures(replays, validator) }
FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject: report, options: [.sortedKeys]))
FileHandle.standardOutput.write(Data("\n".utf8))
