import toolboxify from "../content/providers/gitlab/toolboxify.js";

try {
  await toolboxify(false);
  console.log("GitLab initialized");
} catch (error) {
  console.error("GitLab initialization failed", error);
}
