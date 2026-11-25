import { load } from "cheerio";
import { createHash } from "node:crypto";
export const hash=text=>createHash("sha256").update(text).digest("hex");
const clean=text=>text.replace(/\s+/g," ").trim();
const terms=["幸福飽胃站","幸福保衛站","安心午餐券","學習扶助","食物銀行","實物銀行","午餐補助","獎助學金","制服費","課輔","家扶中心","寄養"];
export function lookupTerms(resource) {
  if (resource.sourceTerms?.length) return resource.sourceTerms;
  const text=resource.name.replace(/實（食）物銀行/g,"食物銀行").replace(/\s+/g," ");
  return [...new Set([text.split(/[（(]/)[0].trim(), ...(resource.name.includes("實（食）物銀行")?["實物銀行"]:[]), ...terms.filter(w=>text.includes(w))])].filter(w=>w.length>=2);
}
async function fetchHtml(url,origin,hop=0) {
  if (url.protocol!=="https:" || url.origin!==origin || hop>2) throw Error("來源已轉往其他網站，待確認");
  const response=await fetch(url,{redirect:"manual",signal:AbortSignal.timeout(5500),headers:{accept:"text/html"}});
  if ([301,302,303,307,308].includes(response.status) && response.headers.get("location"))
    return fetchHtml(new URL(response.headers.get("location"),url),origin,hop+1);
  if(!response.ok || !/text\/html|application\/xhtml/i.test(response.headers.get("content-type")||"")) throw Error("公告無法讀取或非網頁格式");
  const chunks=[];let size=0;
  for await(const chunk of response.body) {
    size+=chunk.byteLength;
    if(size>1600000) throw Error("公告過大，待人工確認");
    chunks.push(chunk);
  }
  return {url:url.href,$:load(Buffer.concat(chunks).toString("utf8"))};
}
export async function getNotice(resource) {
  if(resource.archiveOnly) throw Error("已收錄歷年活動紀錄，等待新年度公告");
  if(!resource.url || !resource.url.startsWith("https://")) throw Error("未收錄可查詢的公告網址");
  const source=new URL(resource.url);
  if(/(^|\.)google\.|(^|\.)facebook\.|(^|\.)udn\.com$/.test(source.hostname) || /\.pdf$/i.test(source.pathname)) throw Error("地圖、媒體或文件來源，需人工確認");
  const keywords=lookupTerms(resource);
  let page=await fetchHtml(source,source.origin);
  if(source.pathname==="/" || /^\/index\.(php|html?)$/.test(source.pathname)){
    const candidates=page.$("a[href]").toArray().map(a=>({href:page.$(a).attr("href"),title:clean(page.$(a).text())})).filter(a=>keywords.some(k=>a.title.includes(k)));
    let link;
    for(const a of candidates) { try{const u=new URL(a.href,source);if(u.origin===source.origin && u.pathname!==source.pathname){link=u;break;}}catch{} }
    if(!link) throw Error("機構首頁沒有找到相符公告");
    page=await fetchHtml(link,source.origin);
  }
  const $=page.$;
  $("script,style,header,footer,nav,aside,noscript,button,input,select,textarea").remove();
  const main=$("article,main,[role=main],.page-content,.article-content").first();
  let text=clean((main.length?main:$("body")).text());
  if (resource.bankCounty) {
    // Each ministry entry starts with the county followed by the application contact.
    const counties=Object.keys(globalThis.tongxingCatalog.TOWNS);
    const directory=text.replace(/[\s\u200b]+/g,"").replace(/台/g,"臺");
    const headings=new RegExp("("+counties.join("|")+")(?=申請)","g");
    const entries=[...directory.matchAll(headings)];
    const i=entries.findIndex(entry=>entry[1]===resource.bankCounty);
    if(i<0) throw Error("衛福部名錄未找到本縣市的申請窗口");
    text=directory.slice(entries[i].index,entries[i+1]?.index).split(/(?<!申請、)捐贈物資[：:]|附件下載|\d{4}\/\d+更新/)[0];
  }
  if (resource.libraryDistrict) {
    const heading=$("h2,h3,h4").filter((_,node)=>clean($(node).text())===resource.libraryDistrict).first();
    const table=heading.nextAll("table").first();
    if(!heading.length || !table.length || !heading.nextUntil("h2,h3,h4").toArray().includes(table[0]))
      throw Error("已收錄北市圖名錄，本區館舍表格需人工確認");
    text=resource.libraryDistrict+" "+clean(table.text());
  }
  const index=keywords.map(k=>text.indexOf(k)).filter(i=>i>=0).sort((a,b)=>a-b)[0];
  if(index===undefined || text.length<(resource.bankCounty?10:50)) throw Error("來源未找到對應的計畫文字");
  const excerpt=text.slice(Math.max(0,index-160),index+2600);
  return {excerpt,url:page.url,digest:hash(page.url+"\n"+excerpt)};
}
