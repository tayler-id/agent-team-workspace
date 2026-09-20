import Foundation

// Independent non-production replay oracle over schema-validated, generated-type-decoded fixture values.
func replayFixtures(_ vectors: [[String: Any]], _ validator: SchemaValidator) throws -> [[String: Any]] {
	func checked(_ name: String, _ value: [String: Any]) throws -> [String: Any]? {
		guard validator.validate(value, component: name) == nil, let decode = generated[name] else { return nil }
		return try JSONSerialization.jsonObject(with: decode(JSONSerialization.data(withJSONObject: value))) as? [String: Any]
	}
	func message(_ value: [String: Any], tombstone: Bool) -> [String: Any] {
		let content: [String: Any] = tombstone ? ["tag": "tombstone"] : ["tag": "visible", "body": value["body"]!]
		return ["id": (value["message_id"] as! String).lowercased(), "createdSeq": value["created_seq"]!, "revision": value["revision"]!, "content": content]
	}
	func card(_ value: [String: Any]) -> [String: Any] {
		["id": (value["run_id"] as! String).lowercased(), "revision": value["run_revision"]!, "state": value["state"]!]
	}
	func coreEvent(_ value: [String: Any]) -> [String: Any] {
		let payload = value["payload"] as! [String: Any], kind = value["kind"] as! String
		let change: [String: Any] = kind == "fixture.run_card" ? ["type": "run", "run": card(payload)] : ["type": "message", "message": message(payload, tombstone: kind == "fixture.message_tombstone")]
		return ["type": "event", "streamId": (value["stream_id"] as! String).lowercased(), "seq": value["seq"]!, "change": change]
	}
	func number(_ value: Any?) -> UInt64 { UInt64(value as! String)! }
	return try vectors.map { vector in
		let id = vector["id"] as? String ?? "invalid"
		let empty: [String: Any] = ["rooms": [], "commands": [], "drafts": []]
		guard let input = vector["snapshot"] as? [String: Any], let snapshot = try checked("FixtureSyncSnapshot", input) else { return ["id": id, "outcome": "fail", "state": empty] }
		let start = snapshot["cursor"] as! [String: Any], state = snapshot["state"] as! [String: Any]
		let stream = (start["stream_id"] as! String).lowercased(), seen = number(snapshot["last_seen_room_seq"])
		var cursor = number(start["committed_seq"]), mode = "live"
		var messages: [String: [String: Any]] = [:], runs: [String: [String: Any]] = [:]
		for value in state["messages"] as! [[String: Any]] { let m = message(value, tombstone: false); messages[m["id"] as! String] = m }
		for value in state["tombstones"] as! [[String: Any]] { let m = message(value, tombstone: true); messages[m["id"] as! String] = m }
		for value in state["run_cards"] as! [[String: Any]] { let r = card(value); runs[r["id"] as! String] = r }
		var pending: [UInt64: [String: Any]] = [:]
		let components = ["fixture.message_revision": "FixtureSyncMessageEvent", "fixture.message_tombstone": "FixtureSyncTombstoneEvent", "fixture.run_card": "FixtureSyncRunCardEvent"]
		for raw in vector["events"] as? [[String: Any]] ?? [] {
			guard let kind = raw["kind"] as? String, let component = components[kind], let event = try checked(component, raw), (event["stream_id"] as! String).lowercased() == stream else { mode = "upgrade"; continue }
			if mode == "upgrade" || mode == "resync" { continue }
			let seq = number(event["seq"])
			if seq <= cursor || pending[seq] != nil { continue }
			if pending.count >= 1000 && seq != cursor + 1 { mode = "resync"; pending.removeAll(); continue }
			pending[seq] = event
			while cursor < UInt64.max, let next = pending.removeValue(forKey: cursor + 1) {
				let payload = next["payload"] as! [String: Any]
				if next["kind"] as! String == "fixture.run_card" {
					let r = card(payload), key = (payload["run_id"] as! String).lowercased()
					if runs[key] == nil || number(r["revision"]) > number(runs[key]!["revision"]) { runs[key] = r }
				} else {
					let m = message(payload, tombstone: next["kind"] as! String == "fixture.message_tombstone"), key = (payload["message_id"] as! String).lowercased()
					if number(m["createdSeq"]) > cursor + 1 || (messages[key] != nil && number(messages[key]!["createdSeq"]) != number(m["createdSeq"])) { mode = "resync"; pending.removeAll(); break }
					if messages[key] == nil || number(m["revision"]) > number(messages[key]!["revision"]) { messages[key] = m }
				}
				cursor += 1
			}
			if mode != "resync" { mode = pending.isEmpty ? "live" : "gap" }
		}
		let ordered = messages.values.sorted { number($0["createdSeq"]) == number($1["createdSeq"]) ? ($0["id"] as! String) < ($1["id"] as! String) : number($0["createdSeq"]) < number($1["createdSeq"]) }
		let unread = ordered.filter { ($0["content"] as! [String: Any])["tag"] as! String == "visible" && number($0["createdSeq"]) > seen }.count
		let room: [String: Any] = ["streamId": stream, "cursor": String(cursor), "lastSeen": String(seen), "mode": mode, "unread": unread, "messages": ordered, "runs": runs.values.sorted { ($0["id"] as! String) < ($1["id"] as! String) }, "pending": pending.keys.sorted().map { coreEvent(pending[$0]!) }]
		let result: [String: Any] = ["rooms": [room], "commands": [], "drafts": []]
		return ["id": id, "outcome": NSDictionary(dictionary: result).isEqual(to: vector["expected"] as? [String: Any] ?? [:]) ? "pass" : "fail", "state": result]
	}
}
