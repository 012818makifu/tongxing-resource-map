# 關聯網址
- google ai studio 影片製作
https://aistudio.google.com/prompts/new_chat
- 傳說中的小法_ai法律代理人
https://talking-agent-lake.vercel.app/
- 本網站的前身
https://astonishing-sunburst-c57be3.netlify.app/
- 網頁居住的家
https://vercel.com/m-0291/tongxing-resource-map

# 童行資源地圖
臺灣兒少餐食、衣物與學習資源查詢。首頁支援自然語言，亦可用原有的分類、關鍵字與行政區地圖。
## 部署
Vercel 專案從 main 部署，建置指令為 npm run build。使用 Node.js 22 以上。
- ANTHROPIC_API_KEY 用於公開查詢與管理者更新。若金鑰未限定工作區，另設 ANTHROPIC_WORKSPACE_ID（wrkspc_ 開頭）。CHILD_MAP_MODEL 可覆寫預設 claude-haiku-5-5。
- CHILD_MAP_ADMIN_PASSWORD 限制行政區更新。每次只處理選定行政區，逐筆顯示比對結果。
- 連結一個 private Vercel Blob store，讓 BLOB_READ_WRITE_TOKEN 自動注入。更新結果會寫入共同資料，訪客重新載入可看到已發布的異動。
- public/index.html 首頁底部有網站教學影片及預留的 YouTube 位置。將 public/media/guide.mp4 上傳到自己的頻道後，可在該處貼上影片超連結。
## 更新範圍
管理者按更新後，以「縣市、行政區、兒少餐食、制服、學習扶助」搜尋政府與教育網站。每區當日搜尋結果可重用，並在該區資源旁呈現可核對的公告線索。既有資料的每筆來源取自 public/catalog.js。直接公告會擷取相關段落。機構首頁會以計畫名稱找同站公告。沒有可比對的文字或可驗證的新欄位時保留原資料。這是既有清單的更新工具；新增計畫需補入清單。
