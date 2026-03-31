// claude-code-statusline
// https://github.com/haunchen/claude-code-statusline
//
// A cross-platform statusline for Claude Code that shows
// peak/off-peak hours, context usage, cost, and rate limits.
//
// Zero external dependencies — only requires Node.js.

// No timezone configuration needed.
// Peak detection uses UTC directly (13:00–19:00 UTC / 5am–11am PT)
// and works automatically in any timezone.

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
    // We check directly in UTC (13:00–19:00) to avoid timezone
    // conversion bugs (midnight wrap, half-hour offsets, DST).
    // Weekday is checked in PT (UTC-8) since Anthropic defines
    // "weekday" by Pacific Time.
    const utcNow = new Date();
    const utcHour = utcNow.getUTCHours();
    const utcMin = utcNow.getUTCMinutes();

    // Weekday check in PT (UTC-8)
    const ptNow = new Date(Date.now() - 8 * 3600_000);
    const ptDay = ptNow.getUTCDay(); // 0=Sun, 6=Sat
    const isWeekend = ptDay === 0 || ptDay === 6;

    const isPeak = !isWeekend && utcHour >= 13 && utcHour < 19;

    let peakLabel;
    if (isPeak) {
      const minsLeft = (19 - utcHour) * 60 - utcMin;
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
