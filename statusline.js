// claude-code-statusline
// https://github.com/haunchen/claude-code-statusline
//
// A cross-platform statusline for Claude Code that shows
// peak/off-peak hours, context usage, cost, and rate limits.
//
// Zero external dependencies — only requires Node.js.

// ─── Configuration ──────────────────────────────────────
// Set your UTC offset here. Examples:
//   UTC+8  (Taiwan/Singapore/HK)  → 8
//   UTC+9  (Japan/Korea)          → 9
//   UTC+1  (CET)                  → 1
//   UTC-5  (EST)                  → -5
const UTC_OFFSET = 8;
// ────────────────────────────────────────────────────────

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    const model = data.model?.display_name || '?';
    const size = data.context_window?.context_window_size || 200000;
    const usage = data.context_window?.current_usage;
    const RST = '\x1b[0m';
    const RED = '\x1b[31m';
    const YLW = '\x1b[33m';
    const GRN = '\x1b[32m';

    function colorize(pct) {
      if (pct < 60) return GRN;
      if (pct < 80) return YLW;
      return RED;
    }

    function fmtCountdown(resetsAt) {
      if (!resetsAt) return '';
      const seconds = resetsAt - Math.floor(Date.now() / 1000);
      if (seconds <= 0) return '';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return h > 0 ? ` (${h}h${m.toString().padStart(2, '0')}m)` : ` (${m}m)`;
    }

    // ─── Context usage ──────────────────────────────────
    let ctxPct = 0;
    if (usage) {
      const cur = (usage.input_tokens || 0)
        + (usage.cache_creation_input_tokens || 0)
        + (usage.cache_read_input_tokens || 0);
      ctxPct = Math.round(cur * 100 / size);
    }

    // ─── Cost ───────────────────────────────────────────
    const cost = data.cost?.total_cost_usd || 0;
    const costStr = cost < 1 ? `$${cost.toFixed(4)}` : `$${cost.toFixed(2)}`;

    // ─── Peak / Off-peak detection ──────────────────────
    // Peak hours (official): Weekdays 5am–11am PT / 1pm–7pm GMT
    // This block converts to your local timezone via UTC_OFFSET
    // and determines if you're in the peak window.
    //
    // The approach: add UTC_OFFSET hours to UTC timestamp,
    // then read with getUTC* methods — works on any OS/timezone.
    const now = new Date(Date.now() + UTC_OFFSET * 3600_000);
    const day = now.getUTCDay();   // 0=Sun, 6=Sat
    const hour = now.getUTCHours();
    const mins = now.getUTCMinutes();
    const isWeekend = day === 0 || day === 6;

    // Convert peak hours (5am–11am PT) to local time:
    // PT = UTC-7, so 5am PT = 12:00 UTC = (12 + UTC_OFFSET):00 local
    //              11am PT = 18:00 UTC = (18 + UTC_OFFSET):00 local
    // For UTC+8: 20:00–02:00+1 (wraps midnight)
    // For UTC+9: 21:00–03:00+1
    let peakStartLocal = (12 + UTC_OFFSET) % 24;
    let peakEndLocal = (18 + UTC_OFFSET) % 24;
    if (peakStartLocal < 0) peakStartLocal += 24;
    if (peakEndLocal < 0) peakEndLocal += 24;

    let isPeak;
    if (peakStartLocal < peakEndLocal) {
      // No midnight wrap (e.g. UTC-5: 7:00–13:00)
      isPeak = !isWeekend && hour >= peakStartLocal && hour < peakEndLocal;
    } else {
      // Wraps midnight (e.g. UTC+8: 20:00–02:00)
      isPeak = !isWeekend && (hour >= peakStartLocal || hour < peakEndLocal);
    }

    let peakLabel;
    if (isPeak) {
      let minsLeft;
      if (peakStartLocal < peakEndLocal) {
        minsLeft = (peakEndLocal - hour) * 60 - mins;
      } else {
        minsLeft = hour >= peakStartLocal
          ? ((24 - hour + peakEndLocal) * 60 - mins)
          : ((peakEndLocal - hour) * 60 - mins);
      }
      const h = Math.floor(minsLeft / 60);
      const m = minsLeft % 60;
      const cd = h > 0 ? `${h}h${m.toString().padStart(2, '0')}m` : `${m}m`;
      peakLabel = `${RED}PEAK ${cd}${RST}`;
    } else {
      peakLabel = `${GRN}OFF-PEAK${RST}`;
    }

    // ─── Rate limits ────────────────────────────────────
    const five = data.rate_limits?.five_hour;
    const seven = data.rate_limits?.seven_day;
    const fivePct = Math.round(five?.used_percentage ?? 0);
    const sevenPct = Math.round(seven?.used_percentage ?? 0);
    const fiveCD = five ? fmtCountdown(five.resets_at) : '';

    // ─── Output ─────────────────────────────────────────
    process.stdout.write(
      `${peakLabel} | ${model} | ${colorize(ctxPct)}ctx: ${ctxPct}%${RST} | ${costStr} | ${colorize(fivePct)}5h: ${fivePct}%${RST}${fiveCD} | ${colorize(sevenPct)}7d: ${sevenPct}%${RST}`
    );
  } catch {
    process.stdout.write('? | ctx: 0% | $0.0000 | 5h: 0% | 7d: 0%');
  }
});
