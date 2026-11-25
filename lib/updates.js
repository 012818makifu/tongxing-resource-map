import { get, head, put } from "@vercel/blob";
const path="map/updates-v1.json";
export async function readUpdates() {
  const file=await get(path,{access:"private",useCache:false});
  if (!file) return { records:{}, etag:null };
  return {records:await new Response(file.stream).json(),etag:file.blob.etag};
}
export async function writeUpdate(id, oldDigest, entry) {
  for (let attempt=0;attempt<3;attempt++) {
    const {records,etag}=await readUpdates();
    if (records[id]?.digest===entry.digest) return;
    if ((records[id]?.digest||"")!==oldDigest) throw Error("資料已在其他分頁更新，請再試一次");
    records[id]=entry;
    try {
      // A compressed private GET can carry a weak HTTP ETag. Blob writes require the strong storage ETag.
      let writeTag=etag;
      if(etag?.startsWith("W/")) {
        writeTag=(await head(path)).etag;
        if(writeTag!==etag.slice(2)) throw Error("資料版本已變更，請重新核對");
      }
      await put(path,JSON.stringify(records),{access:"private",contentType:"application/json",addRandomSuffix:false,allowOverwrite:Boolean(etag),...(etag?{ifMatch:writeTag}:{})});
      return;
    } catch(e) { if (attempt===2) throw e; }
  }
}
