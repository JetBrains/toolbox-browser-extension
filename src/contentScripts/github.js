import toolboxify from "../content/providers/github/toolboxify.js";

try {
  await toolboxify(false);
  console.log("GitHub initialized");
} catch (error) {
  console.error("GitHub initialization failed", error);
}
