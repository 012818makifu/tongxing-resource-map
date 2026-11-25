import {modelRequest} from "./model.js";
const localDate=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Taipei"}).format(new Date());
export const searchDay=localDate;
export async function districtNotices(county,town) {
  if(!process.env.ANTHROPIC_API_KEY) throw Error("尚未設定 AI 金鑰");
  const query=county+" "+town+" 兒少 餐食補助 制服 學習扶助 最新公告";
  const body=await modelRequest({max_tokens:450,
      tools:[{type:"web_search_20250305",name:"web_search",max_uses:1,allowed_domains:["gov.tw","edu.tw","gov.taipei"]}],
      messages:[{role:"user",content:"查詢以下行政區最新、當期適用的政府或學校兒少福利公告。執行一次網頁搜尋，然後簡短回覆。搜尋詞："+query+"。今天是 "+localDate()}]},40000);
  const blocks=body.content?.filter(x=>x.type==="web_search_tool_result" && Array.isArray(x.content));
  if(!blocks?.length) throw Error("未取得搜尋結果，請確認 Claude 已開放網路搜尋");
  const found=new Map(),norm=s=>s.replace(/台/g,"臺");
  for(const x of blocks.flatMap(b=>b.content)) {
    if(x.type!=="web_search_result" || typeof x.title!=="string") continue;
    let url;try{url=new URL(x.url);}catch{continue;}
    if(url.protocol!=="https:"||!(/\.(?:(gov|edu)\.tw|gov\.taipei)$/.test(url.hostname))||url.username||url.password)continue;
    if(![norm(county).slice(0,-1),norm(town)].some(k=>norm(x.title).includes(k)))continue;
    if(!/餐|食物|弱勢|學習扶助|制服|課輔|兒少|獎助|課後/.test(x.title))continue;
    found.set(url.href,{title:x.title.slice(0,200),url:url.href});
  }
  return [...found.values()].slice(0,5);
}
