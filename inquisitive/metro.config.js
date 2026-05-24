const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Stub out Node.js built-in modules that some SDKs (e.g. @anthropic-ai/sdk) try to import.
// These are only used in Node.js credential-loading code paths that never run in React Native.
const nodeBuiltinStub = require.resolve("./src/shims/node-built-in.js");
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("node:")) {
    return { filePath: nodeBuiltinStub, type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./src/global.css" });
