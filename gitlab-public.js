import toolboxify from "./providers/gitlab/index.js";

try {
  await toolboxify(false);
  console.log("GitLab initialized");
} catch (error) {
  console.error("GitLab initialization failed", error);
}
