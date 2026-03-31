// Peak/off-peak + rate limits (no context or cost).
// Change UTC_OFFSET to match your timezone.

const UTC_OFFSET = 8;

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    const model = data.model?.display_name || '?';
    const RST = '\x1b[0m';

    function colorize(pct) {
      if (pct < 60) return '\x1b[32m';
      if (pct < 80) return '\x1b[33m';
      return '\x1b[31m';
    }

    function fmtCountdown(resetsAt) {
      if (!resetsAt) return '';
      const seconds = resetsAt - Math.floor(Date.now() / 1000);
      if (seconds <= 0) return '';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return h > 0 ? ` (${h}h${m.toString().padStart(2, '0')}m)` : ` (${m}m)`;
    }

    // Peak detection
    const now = new Date(Date.now() + UTC_OFFSET * 3600_000);
    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    const mins = now.getUTCMinutes();
    const isWeekend = day === 0 || day === 6;

    let peakStart = (12 + UTC_OFFSET) % 24;
    let peakEnd = (18 + UTC_OFFSET) % 24;
    if (peakStart < 0) peakStart += 24;
    if (peakEnd < 0) peakEnd += 24;

    let isPeak;
    if (peakStart < peakEnd) {
      isPeak = !isWeekend && hour >= peakStart && hour < peakEnd;
    } else {
      isPeak = !isWeekend && (hour >= peakStart || hour < peakEnd);
    }

    let peakLabel;
    if (isPeak) {
      let minsLeft;
      if (peakStart < peakEnd) {
        minsLeft = (peakEnd - hour) * 60 - mins;
      } else {
        minsLeft = hour >= peakStart
          ? ((24 - hour + peakEnd) * 60 - mins)
          : ((peakEnd - hour) * 60 - mins);
      }
      const h = Math.floor(minsLeft / 60);
      const m = minsLeft % 60;
      const cd = h > 0 ? `${h}h${m.toString().padStart(2, '0')}m` : `${m}m`;
      peakLabel = `\x1b[31mPEAK ${cd}${RST}`;
    } else {
      peakLabel = `\x1b[32mOFF-PEAK${RST}`;
    }

    // Rate limits
    const five = data.rate_limits?.five_hour;
    const seven = data.rate_limits?.seven_day;
    const fivePct = Math.round(five?.used_percentage ?? 0);
    const sevenPct = Math.round(seven?.used_percentage ?? 0);
    const fiveCD = five ? fmtCountdown(five.resets_at) : '';

    process.stdout.write(
      `${peakLabel} | ${model} | ${colorize(fivePct)}5h: ${fivePct}%${RST}${fiveCD} | ${colorize(sevenPct)}7d: ${sevenPct}%${RST}`
    );
  } catch {
    process.stdout.write('? | 5h: 0% | 7d: 0%');
  }
});
