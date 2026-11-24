const agentForm = document.getElementById("agent"), agentStatus = document.getElementById("agentStatus");
document.getElementById("homeAI").onsubmit = event => {
  event.preventDefault();
  document.getElementById("goQuiz").click();
  document.getElementById("situation").value = document.getElementById("homeText").value;
  agentForm.requestSubmit();
};
agentForm.onsubmit = async event => {
  event.preventDefault();
  const button = document.getElementById("interpret");
  const message = document.getElementById("situation").value.trim();
  if (!message || button.disabled) return;
  button.disabled = true;
  document.getElementById("qres").replaceChildren();
  agentStatus.textContent = "正在整理需求並搜尋資源…";
  try {
    const response = await fetch("/api/query", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({message}), signal:AbortSignal.timeout(30000)});
    const data = await response.json();
    if (!response.ok || !data.filters) throw Error(data.error || "AI 暫時無法連線。");
    const f = data.filters;
    const form = document.getElementById("qform");
    form.reset();
    document.getElementById("qres").replaceChildren();
    const county = document.getElementById("qc");
    county.value = String(f.county || "").replace(/台/g, "臺");
    if (!county.value) county.selectedIndex = 0;
    county.dispatchEvent(new Event("change"));
    const district = document.getElementById("qd");
    district.value = String(f.town || "").replace(/台/g, "臺");
    if (!district.value) district.selectedIndex = 0;
    const selections = { qa: [f.age], qs: f.status, qn: f.need, qt: [f.time] };
    const labels = [county.value, district.value].filter(Boolean);
    for (const input of form.querySelectorAll("input")) {
      const values = selections[input.name];
      input.checked = Boolean(input.value && Array.isArray(values) && values.includes(input.value));
      if (input.checked) labels.push(input.nextElementSibling.textContent);
    }
    agentStatus.textContent = labels.length
      ? "我讀到「" + labels.join("、") + "」。可修改條件再查。"
      : "還讀不出查詢條件。可以補充孩子住哪裡、讀幾年級，或需要哪方面的幫助。";
    if (f.town && !district.value) agentStatus.textContent += " 行政區尚未確認，請手動選擇。";
    if (labels.length) form.requestSubmit();
  } catch(e) { agentStatus.textContent = e.message + " 你也可以直接使用下方五題。"; }
  finally { button.disabled=false; }
};
