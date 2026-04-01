# Claude Code Statusline

[English](README.md) | [繁體中文](README_zh-TW.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![Node.js](https://img.shields.io/badge/node.js-%3E%3D14-brightgreen)

A cross-platform statusline for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that displays peak/off-peak hour awareness, context window usage, session cost, and rate limits — all in one glance. Zero configuration required.

![Off-peak statusline showing green OFF-PEAK indicator with model, context, cost and rate limit info](screenshots/off-peak.png)
![Peak statusline showing red PEAK indicator with countdown timer](screenshots/peak.png)

## Why?

During peak hours, Claude Code burns through your 5-hour session limit faster. This statusline lets you see at a glance whether you're in peak or off-peak hours, how much of your rate limit you've used, and when it resets — so you can plan your usage accordingly.

## Background

In March 2026, Anthropic [announced](https://x.com/trq212/status/2037254607001559305) adjustments to Claude's 5-hour session limits during peak hours:

> "During weekdays between 5am–11am PT / 1pm–7pm GMT, you'll move through your 5-hour session limits faster than before."
> — Thariq Shihipar, Anthropic

About 7% of users are affected. Weekly limits remain unchanged. Weekends are entirely off-peak.

See also: [Claude March 2026 Usage Promotion](https://support.claude.com/en/articles/14063676-claude-march-2026-usage-promotion) (expired)

### Peak hours by timezone

| Timezone | Peak hours (weekdays only) |
|----------|---------------------------|
| PT (UTC-8) | 05:00 – 11:00 |
| ET (UTC-5) | 08:00 – 14:00 |
| GMT (UTC+0) | 13:00 – 19:00 |
| CET (UTC+1) | 14:00 – 20:00 |
| IST (UTC+5.5) | 18:30 – 00:30+1 |
| CST (UTC+8) | 21:00 – 03:00+1 |
| JST/KST (UTC+9) | 22:00 – 04:00+1 |

Weekends are **all-day off-peak** regardless of timezone.

> For users in Asia (UTC+8/+9), normal working hours (9am–6pm) are entirely off-peak. Peak hours fall late at night when most people are asleep.

## Features

- **Peak/off-peak indicator** — real-time status with countdown timer during peak hours
- **Context window usage** — percentage with color coding (green → yellow → red)
- **Session cost** — running total in USD
- **5-hour rate limit** — usage percentage with reset countdown
- **7-day rate limit** — usage percentage
- **Zero configuration** — auto-detects peak hours via UTC, works in any timezone
- **Cross-platform** — single Node.js script runs on Windows, macOS, and Linux

## Prerequisites

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- [Node.js](https://nodejs.org/) (any recent version)

Node.js was chosen over bash specifically for cross-platform compatibility — the same script runs identically on Windows, macOS, and Linux without modification.

## Quick Start

### Option 1: Installer

**macOS / Linux:**

```bash
git clone https://github.com/haunchen/claude-code-statusline.git
cd claude-code-statusline
bash install.sh
```

**Windows (PowerShell):**

```powershell
git clone https://github.com/haunchen/claude-code-statusline.git
cd claude-code-statusline
powershell -ExecutionPolicy Bypass -File install.ps1
```

The installer will:
1. Check that Node.js is installed
2. Ask where to install the script (default: `~/.claude/`)
3. Back up your existing `~/.claude/settings.json`
4. Add the statusLine configuration

### Option 2: Manual setup

1. Clone this repo anywhere on your machine
2. Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /path/to/claude-code-statusline/statusline.js",
    "padding": 0
  }
}
```

3. Restart Claude Code

### Option 3: Let Claude Code do it

Run `/statusline` inside Claude Code and paste this prompt:

> Show peak/off-peak hours for Claude Code based on my timezone. During peak hours (weekdays 5am-11am PT), show "PEAK" in red with a countdown. During off-peak, show "OFF-PEAK" in green. Weekends are always off-peak. Also show: model name, context usage %, session cost, 5-hour rate limit % with reset countdown, and 7-day rate limit %. Color-code percentages green/yellow/red at 60%/80% thresholds.

## Customization

### Use a simpler version

Check the `examples/` folder:

| File | What it shows |
|------|---------------|
| `examples/minimal.js` | Peak/off-peak + model name only |
| `examples/with-rate-limits.js` | Peak/off-peak + model + rate limits |
| `statusline.js` | Everything (peak, context, cost, rate limits) |

## How it works

Claude Code runs the statusline script after each assistant message. It pipes a JSON object to stdin containing session data:

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

The script reads this JSON, determines peak/off-peak status, and prints the formatted statusline to stdout.

### Peak detection logic

Since Anthropic defines peak hours as "1pm–7pm GMT", the script checks directly against UTC — no timezone conversion or configuration needed:

```javascript
const utcHour = new Date().getUTCHours();
const isPeak = !isWeekend && utcHour >= 13 && utcHour < 19;
```

Weekday/weekend is checked in PT (UTC-8) since Anthropic defines "weekday" by Pacific Time. This avoids edge cases at local midnight where the local day may differ from the PT day.

## License

MIT
