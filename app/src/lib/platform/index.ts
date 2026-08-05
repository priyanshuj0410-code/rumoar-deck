/**
 * Platform adapter layer.
 *
 * Feature code imports from here and never touches a browser API directly. Today every
 * capability resolves to its web implementation; adding Capacitor means adding a native
 * implementation beside it and switching on `isNative()`, with no feature-code changes.
 *
 * See knowledge/architecture/overview.md § Cross-platform strategy.
 */
export { camera } from "./camera";
export type { Facing, PickedImage, CameraError } from "./camera";
export { share } from "./share";
export { haptics } from "./haptics";
export { notifications } from "./notifications";
export { speech } from "./speech";
export { kv } from "./kv";
export { isNative, isStandalone, isIOS } from "./env";
