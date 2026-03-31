// Minimal statusline — peak/off-peak indicator only.
// No configuration needed — works automatically in any timezone.

const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    const model = data.model?.display_name || '?';
    const RST = '\x1b[0m';

    // Peak: 13:00–19:00 UTC on PT weekdays
    const utcNow = new Date();
    const utcHour = utcNow.getUTCHours();
    const utcMin = utcNow.getUTCMinutes();

    const ptNow = new Date(Date.now() - 8 * 3600_000);
    const ptDay = ptNow.getUTCDay();
    const isWeekend = ptDay === 0 || ptDay === 6;

    const isPeak = !isWeekend && utcHour >= 13 && utcHour < 19;

    let label;
    if (isPeak) {
      const minsLeft = (19 - utcHour) * 60 - utcMin;
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
