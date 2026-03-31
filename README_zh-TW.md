# Claude Code Statusline

[English](README.md) | [繁體中文](README_zh-TW.md)

跨平台的 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 狀態列，一眼掌握尖峰/離峰時段、context 用量、費用與速率限制。

![離峰](screenshots/off-peak.png)
![尖峰](screenshots/peak.png)

## 背景

2026 年 3 月，Anthropic [宣布](https://x.com/trq212/status/2037254607001559305)調整尖峰時段的 5 小時 session 額度：

> "During weekdays between 5am–11am PT / 1pm–7pm GMT, you'll move through your 5-hour session limits faster than before."
> — Thariq Shihipar, Anthropic

約 7% 的使用者受影響。每週總額度不變。週末全天為離峰。

另見：[Claude 2026 年 3 月用量促銷](https://support.claude.com/en/articles/14063676-claude-march-2026-usage-promotion)（已結束）

### 各時區尖峰時段對照

| 時區 | 尖峰時段（僅平日） |
|------|-------------------|
| PT (UTC-8) | 05:00 – 11:00 |
| ET (UTC-5) | 08:00 – 14:00 |
| GMT (UTC+0) | 13:00 – 19:00 |
| CET (UTC+1) | 14:00 – 20:00 |
| IST (UTC+5.5) | 18:30 – 00:30+1 |
| CST (UTC+8) | 21:00 – 03:00+1 |
| JST/KST (UTC+9) | 22:00 – 04:00+1 |

週末不分時區，全天離峰。

> 亞洲使用者（UTC+8/+9）的正常上班時間（9am–6pm）完全落在離峰時段。尖峰時段在深夜，大多數人已經在睡覺了。

## 功能

- 尖峰/離峰即時顯示，尖峰時附倒數計時
- Context window 用量百分比（綠 → 黃 → 紅）
- 本次 session 費用（USD）
- 5 小時速率限制用量 + 重置倒數
- 7 天速率限制用量
- 零設定 — 任何時區自動判斷，不需設定
- 跨平台 — Windows、macOS、Linux 通用

## 系統需求

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- [Node.js](https://nodejs.org/)（任何近期版本）

選用 Node.js 而非 bash，是為了跨平台相容性 — 同一份腳本在 Windows、macOS、Linux 上無需修改即可執行。

## 快速開始

### 方法一：安裝腳本

**macOS / Linux：**

```bash
git clone https://github.com/haunchen/claude-code-statusline.git
cd claude-code-statusline
bash install.sh
```

**Windows (PowerShell)：**

```powershell
git clone https://github.com/haunchen/claude-code-statusline.git
cd claude-code-statusline
powershell -ExecutionPolicy Bypass -File install.ps1
```

安裝腳本會：
1. 檢查 Node.js 是否已安裝
2. 詢問腳本安裝位置（預設 `~/.claude/`）
3. 備份現有的 `~/.claude/settings.json`
4. 寫入 statusLine 設定

### 方法二：手動設定

1. Clone 此 repo 到任意位置
2. 在 `~/.claude/settings.json` 加入：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/claude-code-statusline/statusline.js",
    "padding": 0
  }
}
```

3. 重啟 Claude Code

### 方法三：讓 Claude Code 幫你設定

在 Claude Code 中執行 `/statusline`，貼上以下 prompt：

> Show peak/off-peak hours for Claude Code based on my timezone. During peak hours (weekdays 5am-11am PT), show "PEAK" in red with a countdown. During off-peak, show "OFF-PEAK" in green. Weekends are always off-peak. Also show: model name, context usage %, session cost, 5-hour rate limit % with reset countdown, and 7-day rate limit %. Color-code percentages green/yellow/red at 60%/80% thresholds.

## 自訂設定

### 使用精簡版本

查看 `examples/` 資料夾：

| 檔案 | 顯示內容 |
|------|---------|
| `examples/minimal.js` | 僅尖峰/離峰 + 模型名稱 |
| `examples/with-rate-limits.js` | 尖峰/離峰 + 模型 + 速率限制 |
| `statusline.js` | 完整版（尖峰、context、費用、速率限制） |

## 運作原理

Claude Code 在每次 assistant 回應後執行 statusline 腳本，透過 stdin 傳入包含 session 資料的 JSON：

```json
{
  "model": { "display_name": "Opus" },
  "context_window": {
    "context_window_size": 200000,
    "used_percentage": 8,
    "current_usage": { "input_tokens": 15000, "cache_read_input_tokens": 2000, "..." : "..." }
  },
  "cost": { "total_cost_usd": 0.0123 },
  "rate_limits": {
    "five_hour": { "used_percentage": 23.5, "resets_at": 1738425600 },
    "seven_day": { "used_percentage": 41.2, "resets_at": 1738857600 }
  }
}
```

腳本讀取 JSON，判斷尖峰/離峰狀態，將格式化後的狀態列輸出到 stdout。

### 尖峰判斷邏輯

Anthropic 定義尖峰為 "1pm–7pm GMT"，腳本直接比對 UTC 時間，不需要時區轉換或設定：

```javascript
const utcHour = new Date().getUTCHours();
const isPeak = !isWeekend && utcHour >= 13 && utcHour < 19;
```

平日/週末的判斷使用 PT（UTC-8）時間，因為 Anthropic 以太平洋時間定義「平日」。這避免了本地午夜跨日時，本地日期與 PT 日期不一致的邊界問題。

## 授權

MIT
