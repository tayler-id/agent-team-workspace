import Foundation

// RFC 8785 subset shared with contracts/src/canonical.ts: member names sorted by UTF-16 code units, no
// insignificant whitespace, literal UTF-8 for everything but the JSON escapes. Only whole numbers inside
// the safe integer range are representable; anything else is a strict failure, not a best effort.
enum CanonicalError: Error, CustomStringConvertible {
	case unsupported(String)
	var description: String {
		switch self {
		case .unsupported(let what): return "canonical: unsupported \(what)"
		}
	}
}

enum Canonical {
	static let safeInteger = 9_007_199_254_740_991.0

	static func json(_ value: Any) throws -> String {
		var out = ""
		try write(value, into: &out, at: "$")
		return out
	}

	static func isBoolean(_ number: NSNumber) -> Bool { CFGetTypeID(number) == CFBooleanGetTypeID() }

	private static func write(_ value: Any, into out: inout String, at path: String) throws {
		switch value {
		case is NSNull:
			out += "null"
		case let text as String:
			writeString(text, into: &out)
		case let number as NSNumber:
			if isBoolean(number) { out += number.boolValue ? "true" : "false"; return }
			let double = number.doubleValue
			guard double.isFinite, double == double.rounded(), abs(double) <= safeInteger else { throw CanonicalError.unsupported("number \(number) at \(path)") }
			out += String(Int64(double))
		case let array as [Any]:
			out += "["
			for (index, item) in array.enumerated() {
				if index > 0 { out += "," }
				try write(item, into: &out, at: "\(path)[\(index)]")
			}
			out += "]"
		case let object as [String: Any]:
			let keys = object.keys.sorted { Array($0.utf16).lexicographicallyPrecedes(Array($1.utf16)) }
			out += "{"
			for (index, key) in keys.enumerated() {
				if index > 0 { out += "," }
				writeString(key, into: &out)
				out += ":"
				try write(object[key]!, into: &out, at: "\(path).\(key)")
			}
			out += "}"
		default:
			throw CanonicalError.unsupported("\(type(of: value)) at \(path)")
		}
	}

	private static func writeString(_ text: String, into out: inout String) {
		out += "\""
		for scalar in text.unicodeScalars {
			switch scalar {
			case "\"": out += "\\\""
			case "\\": out += "\\\\"
			case "\u{08}": out += "\\b"
			case "\u{09}": out += "\\t"
			case "\u{0A}": out += "\\n"
			case "\u{0C}": out += "\\f"
			case "\u{0D}": out += "\\r"
			default:
				if scalar.value < 0x20 { out += String(format: "\\u%04x", scalar.value) } else { out.unicodeScalars.append(scalar) }
			}
		}
		out += "\""
	}
}
