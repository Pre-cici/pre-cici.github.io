// Shared scene selection for demos and synchronized comparisons.
window.createSceneControls = function ({ toolbar, content, labels, onSelect }) {
  const choices = document.createElement('div');
  choices.className = 'scene-choices';
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', 'Choose scene');
  toolbar.append(choices);
  const frame = document.createElement('div');
  frame.className = 'scene-frame';
  content.before(frame);
  frame.append(content);
  let active = 0;
  const buttons = labels.map((label, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => select(index));
    choices.append(button);
    return button;
  });
  function update(index) {
    active = (index + labels.length) % labels.length;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === active)));
  }
  function select(index) {
    update(index);
    onSelect(active);
  }
  for (const [step, name, path] of [
    [-1, 'Previous scene', 'M14 6l-6 6 6 6'],
    [1, 'Next scene', 'M10 6l6 6-6 6'],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `scene-arrow ${step < 0 ? 'scene-prev' : 'scene-next'}`;
    button.setAttribute('aria-label', name);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
    button.addEventListener('click', () => select(active + step));
    frame.append(button);
  }
  choices.addEventListener('keydown', (event) => {
    const index = buttons.indexOf(document.activeElement);
    if (index < 0 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    select(index + (event.key === 'ArrowRight' ? 1 : -1));
    buttons[active].focus();
  });
  update(0);
  return { update };
};

// Synchronized playback for a set of clips (demo rows and comparisons).
window.createSyncTransport = function ({ getVideos, onPlayError = () => {} }) {
  let videos = [];
  let playing = false;
  let frame;
  let revision = 0;
  let explicitMax = null;
  const el = document.createElement('div');
  el.className = 'sync-transport';
  el.innerHTML = `<button type="button" class="sync-play" aria-label="Play all videos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg><span>Play</span></button>
    <button type="button" class="sync-restart" aria-label="Replay all videos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/></svg><span>Replay</span></button>
    <input type="range" min="0" max="0" step="0.01" value="0" aria-label="Playback position">
    <output>0.0 / 0.0 s</output>`;
  const play = el.querySelector('.sync-play');
  const seek = el.querySelector('input');
  const output = el.querySelector('output');
  function updatePlayButton() {
    play.querySelector('span').textContent = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} all videos`);
    play.querySelector('path').setAttribute('d', playing ? 'M8 5v14M16 5v14' : 'm8 5 11 7-11 7z');
  }
  function pause() {
    playing = false;
    revision++;
    cancelAnimationFrame(frame);
    videos.forEach(video => video.pause());
    updatePlayButton();
  }
  function durationMax() {
    if (explicitMax !== null) return explicitMax;
    const durations = getVideos().map(video => video.duration).filter(Number.isFinite);
    return durations.length ? Math.min(...durations) : 0;
  }
  function position(time) {
    seek.max = durationMax();
    seek.value = time;
    output.textContent = `${Number(time).toFixed(1)} / ${Number(seek.max).toFixed(1)} s`;
  }
  function tick() {
    if (!playing) return;
    const leader = videos[0];
    if (videos.some(video => video.ended)) {
      pause();
      position(Number(seek.max));
      return;
    }
    for (const video of videos.slice(1)) {
      if (Math.abs(video.currentTime - leader.currentTime) > 0.12) video.currentTime = leader.currentTime;
    }
    position(leader.currentTime);
    frame = requestAnimationFrame(tick);
  }
  async function start() {
    videos = getVideos();
    if (!videos.length) return;
    const token = ++revision;
    const batch = [...videos];
    const time = Number(seek.value) >= Number(seek.max) - 0.05 ? 0 : Number(seek.value);
    batch.forEach(video => { video.currentTime = time; });
    playing = true;
    updatePlayButton();
    const results = await Promise.allSettled(batch.map(video => video.play()));
    if (token !== revision) return;
    if (results.some(result => result.status === 'rejected')) {
      pause();
      onPlayError();
      return;
    }
    // Align again after every player has started.
    batch.forEach(video => { video.currentTime = time; });
    frame = requestAnimationFrame(tick);
  }
  play.addEventListener('click', () => playing ? pause() : start());
  el.querySelector('.sync-restart').addEventListener('click', () => {
    pause();
    videos = getVideos();
    position(0);
    start();
  });
  seek.addEventListener('input', () => {
    pause();
    videos = getVideos();
    videos.forEach(video => { video.currentTime = Number(seek.value); });
    position(seek.value);
  });
  return {
    el,
    pause,
    // Restart the readout once the clip set changes (e.g. scene switch).
    reset() { videos = getVideos(); position(0); },
    // Fixed clip length in seconds, when known; otherwise measured from the players.
    setMax(seconds) { explicitMax = seconds; },
  };
};
