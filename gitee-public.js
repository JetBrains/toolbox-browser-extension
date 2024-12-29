import toolboxify from "./providers/gitee/index.js";

try {
  await toolboxify(false);
  console.log("Gitee initialized");
} catch (error) {
  console.error("Gitee initialization failed", error);
}
