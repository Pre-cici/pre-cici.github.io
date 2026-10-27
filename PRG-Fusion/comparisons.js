const comparisonRoot = document.querySelector('#comparison-groups');
const showcase = window.SHOWCASE;
for (const [trajectories, title] of [
  [['shift3m'], 'Lateral Trajectory Shifts'],
  [['lane_change'], 'Lane-change Trajectories'],
]) {
  const scenes = trajectories.flatMap(trajectory =>
    showcase.cases[trajectory].map(scene => ({ trajectory, scene })));
  let sceneIndex = 0;
  let videos = [];
  const group = document.createElement('div');
  group.className = 'demo-group comparison-group scene-switcher';
  group.innerHTML = `<div class="demo-toolbar">
    <h3 class="demo-group-title">${title}</h3>
    </div>
    <div class="comparison-grid"></div><p class="comparison-status" role="status"></p>`;
  comparisonRoot.append(group);
  const grid = group.querySelector('.comparison-grid');
  const status = group.querySelector('.comparison-status');
  const controls = window.createSceneControls({
    toolbar: group.querySelector('.demo-toolbar'),
    content: grid,
    labels: scenes.map(({ scene }) => `Scene ${scene}`),
    onSelect(index) { sceneIndex = index; loadScene(); },
  });
  const transport = window.createSyncTransport({
    getVideos: () => videos,
    onPlayError() { status.textContent = 'A video could not play. Try again once the clips have loaded.'; },
  });
  status.before(transport.el);
  function loadScene() {
    transport.pause();
    grid.replaceChildren();
    videos = [];
    status.textContent = '';
    const { trajectory, scene } = scenes[sceneIndex];
    controls.update(sceneIndex);
    for (const [method, name] of [['gt', 'Source (GT)'], ...Object.entries(showcase.methods)]) {
      const clip = method === 'gt'
        ? { video: `media/videos/${trajectory}__scene${scene}_gt.mp4` }
        : showcase.clips[`${trajectory}/${scene}/${method}`];
      if (!clip) continue;
      const figure = document.createElement('figure');
      const label = document.createElement('figcaption');
      label.textContent = name;
      if (method === 'ours') label.className = 'ours-label';
      const video = document.createElement('video');
      video.src = clip.video;
      if (clip.poster) video.poster = clip.poster;
      if (method === 'freevs') video.classList.add('bottom-clip');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.setAttribute('aria-label', `${name}, scene ${scene}`);
      video.addEventListener('error', () => {
        if (!grid.contains(video)) return;
        transport.pause();
        status.textContent = `${name}: video unavailable.`;
      });
      figure.append(label, video);
      grid.append(figure);
      videos.push(video);
    }
    grid.classList.toggle('comparison-grid-six', videos.length === 6);
    const clips = Object.keys(showcase.methods).map(method => showcase.clips[`${trajectory}/${scene}/${method}`]).filter(Boolean);
    transport.setMax(Math.min(...clips.map(clip => clip.frames / clip.fps)));
    transport.reset();
  }
  loadScene();
}
