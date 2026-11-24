import test from "node:test";
import assert from "node:assert/strict";
import query from "../api/query.js";
import refresh from "../api/refresh.js";
import {getNotice} from "../lib/sources.js";
const response=()=>({statusCode:200,setHeader(){},status(n){this.statusCode=n;return this},json(data){this.data=data;return this},end(){return this}});
test("所有行政區有資源；任意網址與區外資源均無法指定",async()=>{
  const {TOWNS,resourcesFor}=globalThis.tongxingCatalog;
  assert.equal(Object.values(TOWNS).flat().length,368);
  for(const [c,ds] of Object.entries(TOWNS)) for(const d of ds) assert.ok(resourcesFor(c,d).length);
  process.env.CHILD_MAP_ADMIN_PASSWORD="test-only";
  const res=response();await refresh({method:"POST",headers:{"x-map-password":"test-only"},body:{county:"新北市",town:"板橋區",name:"沒有這項服務"}},res);assert.equal(res.statusCode,400);
});
test("公共查詢使用模型回應，更新路徑限制管理者",async()=>{
  const original=globalThis.fetch;
  process.env.ANTHROPIC_API_KEY="test-only";
  try{
    globalThis.fetch=async()=>Response.json({content:[{type:"tool_use",name:"find_resources",input:{county:"新北市",town:"板橋區",age:"國小",status:[],need:["food"],time:"寒暑假"}}]});
    const res=response();await query({method:"POST",headers:{},body:{message:"板橋小三暑假午餐"}},res);assert.equal(res.data.filters.town,"板橋區");
    const deny=response();await refresh({method:"POST",headers:{},body:{}},deny);assert.equal(deny.statusCode,403);
  }finally{globalThis.fetch=original;delete process.env.ANTHROPIC_API_KEY;}
});
test("從同站公告取得資源段落；未附來源不呼叫模型",async()=>{
  const original=globalThis.fetch;
  try{
    globalThis.fetch=async url=>new Response(url.pathname==="/"?'<a href="/news/lunch">安心午餐券 最新公告</a>':"<main>安心午餐券。"+("週一至週五開放兒少登記。".repeat(8))+"</main>",{headers:{"Content-Type":"text/html"}});
    const notice=await getNotice({name:"安心午餐券",url:"https://example.org/"});
    assert.equal(notice.url,"https://example.org/news/lunch");assert.match(notice.excerpt,/週一/);
    await assert.rejects(getNotice({name:"午餐",url:""}));
  }finally{globalThis.fetch=original;}
});
