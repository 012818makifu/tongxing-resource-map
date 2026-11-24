export async function askClaude({ system, data, name, properties, required, maxTokens }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Error("網站尚未設定 Claude 金鑰");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},
    body: JSON.stringify({
      model: process.env.CHILD_MAP_MODEL || "claude-haiku-4-5", max_tokens:maxTokens,
      system, messages:[{role:"user",content:JSON.stringify(data)}],
      tools:[{name,description:"傳回已核對的結構化資料",input_schema:{type:"object",properties,required}}],
      tool_choice:{type:"tool",name}
    }), signal:AbortSignal.timeout(22000)
  });
  if (!response.ok) throw Error("AI 服務暫時無法使用，請稍後再試");
  const result = await response.json();
  const tool = result.content?.find(x => x.type === "tool_use" && x.name === name);
  if (!tool || result.stop_reason === "max_tokens") throw Error("AI 回覆不完整，請重試");
  return tool.input;
}
