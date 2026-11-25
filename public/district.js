(() => {
  const el=id=>document.getElementById(id);
  let data={}, notices={};
  window.districtNoticeHTML=(c,d)=>{
    const links=notices[JSON.stringify([c,d])]||[];
    if(!links.length) return "";
    return '<aside class="q"><b>政府與學校公告線索</b><p>請開啟原文確認服務期間與適用地區。</p><ul>'+links.map(l=>'<li><a href="'+esc(l.url)+'" target="_blank" rel="noopener">'+esc(l.title)+'</a></li>').join("")+'</ul></aside>';
  };
  window.reviewedResource=(c,d,r)=>{
    const update=data[JSON.stringify([c,d,r.name])];
    if(!update) return r;
    const dates=Object.values(update.evidence).map(x=>x.date).sort();
    const latest=Object.values(update.evidence).sort((a,b)=>b.date.localeCompare(a.date))[0];
    return {...r,...update.fields,note:[r.note,"自動比對公告原文更新於 "+dates.at(-1)].filter(Boolean).join("。"),url:latest?.url||r.url};
  };
  async function reload(){
    const r=await fetch("/api/updates",{cache:"no-store"});
    if(!r.ok) throw Error("無法讀取已發布異動");
    const changes=await r.json();data=changes.records||{};notices=changes.notices||{};
    INDEX=null;
    if(!el("explore").hidden && state.town) renderPanel();
    if(!el("quiz").hidden && el("qres").children.length) el("qform").requestSubmit();
    if(!el("results").hidden && el("q").value) doSearch(el("q").value);
  }
  reload().catch(()=>{el("updateLoadStatus").textContent="最新異動暫時無法載入，目前顯示原有資料。";});
  fillCounties(el("uc"));
  el("uc").onchange=()=>el("ud").replaceChildren(...TOWNS[el("uc").value].map(d=>new Option(d,d)));
  el("uc").onchange();
  el("openUpdates").onclick=()=>{simpleCrumb(el("ucrumb"),"更新行政區資料");setView("updates");};
  el("refreshDistrict").onclick=async()=>{
    const pass=el("adminPass").value;
    if(!pass){el("progress").textContent="請輸入管理密碼。";el("adminPass").focus();return;}
    const c=el("uc").value,d=el("ud").value, rows=resourcesFor(c,d);
    const controls=["uc","ud","refreshDistrict","adminPass"];
    controls.forEach(id=>el(id).disabled=true);
    el("updateLog").replaceChildren();
    let done=0,updated=0,compared=0,skipped=0,errors=0;
    try{
      el("progress").textContent="正在搜尋 "+c+d+" 的政府與學校最新公告…";
      const first=await fetch("/api/discover",{method:"POST",headers:{"Content-Type":"application/json","x-map-password":pass},body:JSON.stringify({county:c,town:d}),signal:AbortSignal.timeout(61000)});
      const report=await first.json();
      if(first.status===403) throw Error(report.error);
      const note=document.createElement("li");note.textContent="地區公告搜尋｜"+(report.message||report.error);el("updateLog").append(note);
      for(const r of rows){
        el("progress").textContent=c+d+"・正在查詢 "+(done+1)+" / "+rows.length;
        const response=await fetch("/api/refresh",{method:"POST",headers:{"Content-Type":"application/json","x-map-password":pass},body:JSON.stringify({county:c,town:d,name:r.name}),signal:AbortSignal.timeout(61000)});
        const out=await response.json();
        if(response.status===403) throw Error(out.error);
        const line=document.createElement("li");
        line.textContent=r.name+"｜"+(out.message||out.error||"本筆查詢失敗");
        el("updateLog").append(line);
        if(out.compared || out.state==="same" || out.state==="updated") compared++;
        done++; if(!response.ok) errors++; else if(out.state==="updated")updated++;else if(out.state==="skipped")skipped++;

      }
      el("progress").textContent="已檢查 "+done+" 筆資源，完成比對 "+compared+" 筆，已發布變更 "+updated+" 筆。略過 "+skipped+" 筆。"+(errors?"另有 "+errors+" 筆發生錯誤，詳見下方各筆結果。":"");
    }catch(e){el("progress").textContent="更新中斷。已確認更新 "+updated+" 筆，尚有 "+(rows.length-done)+" 筆未取得結果。"+e.message;}
    finally{controls.forEach(id=>el(id).disabled=false);await reload().catch(()=>{});}
  };
})();
