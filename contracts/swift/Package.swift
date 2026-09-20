// swift-tools-version:5.10
// Swift consumers of the authoritative Agora contracts. `AgoraContracts` holds only generated code;
// `agora-contracts-conform` is the small conformance consumer that runs contracts/fixtures/vectors.json.
import PackageDescription

let package = Package(
	name: "AgoraContracts",
	platforms: [.macOS(.v14)],
	products: [
		.library(name: "AgoraContracts", targets: ["AgoraContracts"]),
		.executable(name: "agora-contracts-conform", targets: ["AgoraContractsConform"]),
	],
	dependencies: [
		.package(url: "https://github.com/apple/swift-openapi-generator", exact: "1.13.1"),
		.package(url: "https://github.com/apple/swift-openapi-runtime", exact: "1.12.1"),
	],
	targets: [
		.target(name: "AgoraContracts", dependencies: [.product(name: "OpenAPIRuntime", package: "swift-openapi-runtime")]),
		.executableTarget(name: "AgoraContractsConform", dependencies: ["AgoraContracts", .product(name: "OpenAPIRuntime", package: "swift-openapi-runtime")]),
	]
)
