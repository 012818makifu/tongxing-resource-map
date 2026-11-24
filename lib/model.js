const headers=()=>({"x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01",...(process.env.ANTHROPIC_WORKSPACE_ID?{"anthropic-workspace-id":process.env.ANTHROPIC_WORKSPACE_ID.trim()}:{})});
let current;
export async function modelRequest(body,timeout){
  if(!process.env.ANTHROPIC_API_KEY) throw Error("網站尚未設定 Claude 金鑰。");
  const send=model=>fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{...headers(),"content-type":"application/json"},body:JSON.stringify({...body,model}),signal:AbortSignal.timeout(timeout)});
  let res=await send(process.env.CHILD_MAP_MODEL||current||"claude-haiku-5-5");
  let detail = "";
  if (!res.ok) detail = (await res.clone().json().catch(()=>({}))).error?.message || "";
  if((res.status===404 || (res.status===400 && /model.*(retired|unsupported|unavailable|deprecated)|no longer (available|supported)/i.test(detail))) && !process.env.CHILD_MAP_MODEL){
    const models=await fetch("https://api.anthropic.com/v1/models?limit=100",{headers:headers(),signal:AbortSignal.timeout(5000)});
    if(models.ok){
      const ids=(await models.json()).data.map(m=>m.id);
      const candidate=ids.find(id=>id.includes("haiku"))||ids.find(id=>id.includes("sonnet"));
      if(candidate){current=candidate;res=await send(candidate);}
    }
  }
  if(res.ok) return res.json();
  const error=await res.json().catch(()=>({}));
  const reason=String(error.error?.message||"");
  const code=res.status;
  // Only record provider diagnostics for this request schema, never messages or headers.
  const diagnostic=reason.replace(/sk-[\w-]+/g,"[redacted]").replace(/(messages\.\d+[^:]*:).*/i,"$1 [omitted]").slice(0,400);
  console.warn("Claude API",code,error.error?.type,diagnostic);
  if(/anthropic-workspace-id/i.test(reason)) throw Error("Claude 需要設定工作區 ID。可先使用下方條件查詢。");
  if(code===401) throw Error("Claude 拒絕此 API 金鑰。請在 Production 更換金鑰並重新部署。");
  if(/credit balance|billing|insufficient credit|payment/i.test(reason)) throw Error("Claude API 帳戶可用額度不足，請確認金鑰所屬工作區的餘額。");
  if(code===403) throw Error("此 Claude 金鑰尚未取得所需模型或功能的權限。");
  if(code===404) throw Error("Claude 找不到可用模型。請在 Vercel 設定 CHILD_MAP_MODEL。");
  if(code===429) throw Error("Claude 已達請求限制，請稍後再試。");
  throw Error("Claude 服務未完成查詢（HTTP "+code+"）。");
}
