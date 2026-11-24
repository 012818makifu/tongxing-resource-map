import "../public/catalog.js";
import {safeAdmin} from "../lib/access.js";
import {readUpdates,writeUpdate} from "../lib/updates.js";
import {districtNotices,searchDay} from "../lib/discover.js";
export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method!=="POST")return res.status(405).end();
  if(!safeAdmin(req))return res.status(403).json({error:"請確認管理密碼及 Production 設定。"});
  const {county,town}=req.body||{},towns=globalThis.tongxingCatalog.TOWNS;
  if(!Object.hasOwn(towns,county)||!towns[county].includes(town))return res.status(400).json({error:"查無行政區"});
  if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({error:"資料庫尚未連結"});
  try{
    const id=JSON.stringify([county,town]),day=searchDay(),old=(await readUpdates()).records[id];
    if(old?.digest===day)return res.json({message:"今天已搜尋，沿用 "+old.links.length+" 筆公告線索。"});
    const links=await districtNotices(county,town);
    await writeUpdate(id,old?.digest||"",{digest:day,links});
    return res.json({message:"找到 "+links.length+" 筆地區公告線索。"});
  }catch(e){return res.status(503).json({error:"最新公告搜尋未完成，保留上次結果。"});}
}
