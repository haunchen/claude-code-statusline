// Minimal statusline — peak/off-peak indicator only.
// Change UTC_OFFSET to match your timezone.

const UTC_OFFSET = 8;

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    const model = data.model?.display_name || '?';
    const RST = '\x1b[0m';

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

    let label;
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
      label = `\x1b[31mPEAK ${cd}${RST}`;
    } else {
      label = `\x1b[32mOFF-PEAK${RST}`;
    }

    process.stdout.write(`${label} | ${model}`);
  } catch {
    process.stdout.write('? | ?');
  }
});
