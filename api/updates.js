import {readUpdates} from "../lib/updates.js";
export default async function handler(req,res){
  if(req.method!=="GET") return res.status(405).end();
  if(!process.env.BLOB_READ_WRITE_TOKEN) return res.json({records:{}});
  try {
    const {records}=await readUpdates();
    const visible=Object.fromEntries(Object.entries(records).filter(([,r])=>r.fields && Object.keys(r.fields).length).map(([key,r])=>[key,{fields:r.fields,evidence:r.evidence}]));
    res.setHeader("Cache-Control","public, s-maxage=15");
    const notices=Object.fromEntries(Object.entries(records).filter(([,r])=>Array.isArray(r.links)).map(([k,r])=>[k,r.links]));
    return res.json({records:visible,notices});
  } catch {return res.status(503).json({error:"目前無法讀取最新異動。"});}
}
