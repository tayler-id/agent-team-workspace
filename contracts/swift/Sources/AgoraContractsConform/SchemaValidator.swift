import Foundation

// Runtime validation of the tested JSON Schema subset, read from the bundled OpenAPI document at run time.
// Generated types compile without enforcing pattern, bounds or length, so this layer keeps Swift and the
// pinned Ajv validator agreeing on acceptance. contracts/tools/generate.mjs guarantees only these keywords occur.
struct SchemaValidator {
	let components: [String: Any]

	// Returns nil when the value conforms, otherwise the first violation with its instance path.
	func validate(_ value: Any, component: String) -> String? {
		guard let schema = components[component] as? [String: Any] else { return "unknown component \(component)" }
		return check(value, schema, "$")
	}

	private func check(_ value: Any, _ schema: [String: Any], _ path: String) -> String? {
		if let ref = schema["$ref"] as? String {
			let name = ref.replacingOccurrences(of: "#/components/schemas/", with: "")
			guard let target = components[name] as? [String: Any] else { return "\(path) unknown component \(name)" }
			return check(value, target, path)
		}
		switch schema["type"] as? String {
		case "string":
			guard let text = value as? String else { return "\(path) must be string" }
			if let allowed = schema["enum"] as? [String], !allowed.contains(where: { scalarsEqual($0, text) }) { return "\(path) must be equal to one of the allowed values" }
			if let pattern = schema["pattern"] as? String, !matches(pattern, text) { return "\(path) must match pattern \"\(pattern)\"" }
			let length = text.unicodeScalars.count
			if let min = schema["minLength"] as? Int, length < min { return "\(path) must NOT have fewer than \(min) characters" }
			if let max = schema["maxLength"] as? Int, length > max { return "\(path) must NOT have more than \(max) characters" }
			return nil
		case "integer":
			guard let number = value as? NSNumber, !Canonical.isBoolean(number), number.doubleValue == number.doubleValue.rounded(), number.doubleValue.isFinite else { return "\(path) must be integer" }
			let double = number.doubleValue
			if let allowed = schema["enum"] as? [NSNumber], !allowed.contains(where: { $0.doubleValue == double }) { return "\(path) must be equal to one of the allowed values" }
			if let min = schema["minimum"] as? NSNumber, double < min.doubleValue { return "\(path) must be >= \(min)" }
			if let max = schema["maximum"] as? NSNumber, double > max.doubleValue { return "\(path) must be <= \(max)" }
			return nil
		case "boolean":
			guard let number = value as? NSNumber, Canonical.isBoolean(number) else { return "\(path) must be boolean" }
			return nil
		case "object":
			guard let object = value as? [String: Any] else { return "\(path) must be object" }
			let properties = schema["properties"] as? [String: Any] ?? [:]
			for name in schema["required"] as? [String] ?? [] where object[name] == nil { return "\(path) must have required property '\(name)'" }
			for key in object.keys.sorted() where properties[key] == nil { return "\(path) must NOT have additional properties (\(key))" }
			for key in properties.keys.sorted() {
				if let member = object[key], let subschema = properties[key] as? [String: Any], let error = check(member, subschema, "\(path)/\(key)") { return error }
			}
			return nil
		case "array":
			guard let array = value as? [Any] else { return "\(path) must be array" }
			if let min = schema["minItems"] as? Int, array.count < min { return "\(path) must NOT have fewer than \(min) items" }
			if let max = schema["maxItems"] as? Int, array.count > max { return "\(path) must NOT have more than \(max) items" }
			guard let items = schema["items"] as? [String: Any] else { return "\(path) array without items schema" }
			for (index, item) in array.enumerated() {
				if let error = check(item, items, "\(path)/\(index)") { return error }
			}
			return nil
		default:
			return "\(path) schema type outside the subset"
		}
	}

	private func scalarsEqual(_ a: String, _ b: String) -> Bool { a.unicodeScalars.elementsEqual(b.unicodeScalars) }

	// ICU lets `$` match before a trailing line terminator; requiring the match to span the whole UTF-16 range closes that gap.
	private func matches(_ pattern: String, _ text: String) -> Bool {
		guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else { return false }
		let whole = NSRange(location: 0, length: (text as NSString).length)
		guard let match = regex.firstMatch(in: text, options: [], range: whole) else { return false }
		return match.range.location == 0 && match.range.length == whole.length
	}
}
