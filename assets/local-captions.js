// Local HTML files cannot always load sibling WebVTT files. Add cues to
// native caption tracks so the language picker also works when opened offline.
if (location.protocol === 'file:') {
  const player = document.querySelector('video');
  const captions = JSON.parse(document.getElementById('captions').textContent);
  player.querySelectorAll('track').forEach(el => el.remove());
  const asSeconds = time => time.split(':').reduce((sum, n) => sum * 60 + Number(n), 0);
  for (const [lang, vtt] of Object.entries(captions)) {
    const track = player.addTextTrack('captions', lang === 'es' ? 'Español' : 'English', lang);
    track.mode = lang === document.documentElement.lang ? 'showing' : 'hidden';
    for (const block of vtt.trim().split(/\n\n+/).slice(1)) {
      const [range, ...text] = block.split('\n');
      const [start, end] = range.split(' --> ').map(asSeconds);
      track.addCue(new VTTCue(start, end, text.join('\n')));
    }
    if (lang !== document.documentElement.lang) track.mode = 'disabled';
  }
}
