import { modelRequest } from "./model.js";
export async function askClaude({ system, data, name, properties, required, maxTokens }) {
  const result=await modelRequest({
      max_tokens:maxTokens, system, messages:[{role:"user",content:JSON.stringify(data)}],
      tools:[{name,description:"傳回已核對的結構化資料",input_schema:{type:"object",properties,required}}],
      tool_choice:{type:"tool",name}
  },22000);
  const tool = result.content?.find(x => x.type === "tool_use" && x.name === name);
  if (!tool || result.stop_reason === "max_tokens") throw Error("AI 回覆不完整，請重試");
  return tool.input;
}
