// Peak/off-peak + rate limits (no context or cost).
// No configuration needed — works automatically in any timezone.

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

    // Peak: 13:00–19:00 UTC on PT weekdays
    const utcNow = new Date();
    const utcHour = utcNow.getUTCHours();
    const utcMin = utcNow.getUTCMinutes();

    const ptNow = new Date(Date.now() - 8 * 3600_000);
    const ptDay = ptNow.getUTCDay();
    const isWeekend = ptDay === 0 || ptDay === 6;

    const isPeak = !isWeekend && utcHour >= 13 && utcHour < 19;

    let peakLabel;
    if (isPeak) {
      const minsLeft = (19 - utcHour) * 60 - utcMin;
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
