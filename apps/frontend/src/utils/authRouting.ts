// Backward-compatible re-export. All routing logic now lives in postAuthRouting.ts.
export {
  getPostAuthDestination,
  resolvePostAuthDestination,
  isAllowedPostAuthPath,
  saveLastPath,
  getLastPath,
  type PostAuthUser,
} from "./postAuthRouting";
