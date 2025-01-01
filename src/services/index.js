export { default as ActionMenu } from "./ActionMenu.js";
export {
  isHostPermissionGrantedByManifest,
  isHostPermissionGrantedByUser,
  registerContentScript,
  requestHostPermission,
  revokeHostPermission,
  unregisterContentScript,
} from "./Permissions.js";
export { getProtocol, saveProtocol, getModifyPages, saveModifyPages } from "./Storage.js";
