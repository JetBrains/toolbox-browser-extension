import { toolboxify } from "./providers/github/index.js";

toolboxify(false)
  .then(() => {
    console.log("GitHub initialized");
  })
  .catch((error) => {
    console.error("GitHub initialization failed", error);
  });
