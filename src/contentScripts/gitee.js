import toolboxify from "../content/providers/gitee/toolboxify.js";

try {
  await toolboxify(false);
  console.log("Gitee initialized");
} catch (error) {
  console.error("Gitee initialization failed", error);
}
