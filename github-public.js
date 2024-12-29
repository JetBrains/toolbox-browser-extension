import toolboxify from "./providers/github/index.js";

try {
  await toolboxify(false);
  console.log("GitHub initialized");
} catch (error) {
  console.error("GitHub initialization failed", error);
}
