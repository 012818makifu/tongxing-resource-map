import {timingSafeEqual,createHash} from "node:crypto";
const digest=s=>createHash("sha256").update(s).digest();
export function safeAdmin(req){
  const secret=process.env.CHILD_MAP_ADMIN_PASSWORD;
  return Boolean(secret && timingSafeEqual(digest(String(req.headers["x-map-password"]||"")),digest(secret)));
}
