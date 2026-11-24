import { askClaude } from "../lib/claude.js";
const buckets = new Map();
const fields = {
  county:{type:"string",description:"臺灣縣市全名，無法確認留白"},
  town:{type:"string",description:"行政區全名，無法確認留白"},
  age:{type:"string",enum:["","學齡前","國小","國中","高中","大學"]},
  status:{type:"array",items:{type:"string",enum:["低收入戶","中低收入戶","急難","經濟弱勢","學習落後","遺族"]}},
  need:{type:"array",items:{type:"string",enum:["food","cloth","edu"]}},
  time:{type:"string",enum:["","now","平日","假日","寒暑假"]}
};
export default async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  if (req.method !== "POST") return res.status(405).end();
  const message=req.body?.message;
  if (typeof message !== "string" || !message.trim() || message.length>500) return res.status(400).json({error:"請輸入 1 至 500 字。"});
  const minute=Math.floor(Date.now()/60000);
  for(const [id,b] of buckets) if(b.minute!==minute) buckets.delete(id);
  const ip=String(req.headers["x-vercel-forwarded-for"] || req.socket?.remoteAddress || "local").split(",")[0];
  const count=buckets.get(ip)?.count || 0;
  if (count>=6) return res.status(429).json({error:"查詢較頻繁，請稍等一分鐘。"});
  buckets.set(ip,{minute,count:count+1});
  try {
    const text=message.replace(/[A-Z][12]\d{8}|09\d{2}[- ]?\d{3}[- ]?\d{3}|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/gi,"［略］");
    const filters=await askClaude({system:"理解臺灣兒少福利查詢並擷取已表明條件。留意否定，不推定福利身分。五專前三年對應高中。無關、未知填空值。food 餐食，cloth 衣物，edu 學習。",data:text,name:"find_resources",properties:fields,required:Object.keys(fields),maxTokens:240});
    return res.json({filters});
  } catch(e) {return res.status(503).json({error:e.message.startsWith("網站")?e.message:"AI 暫時無法連線，可以先自行勾選條件。"});}
}
