document.querySelectorAll('.demo-group').forEach((group) => {
  const panels = [...group.querySelectorAll('.demo-block')];
  const heading = group.querySelector('.demo-group-title');
  const toolbar = document.createElement('div');
  toolbar.className = 'demo-toolbar';
  heading.before(toolbar);
  toolbar.append(heading);

  const content = document.createElement('div');
  content.className = 'scene-content';
  toolbar.after(content);
  panels.forEach(panel => content.append(panel));

  const labels = panels.map((panel) => {
    // Source clips share the scene/trajectory stem with their generated videos.
    if (!panel.querySelector('.demo-col.source')) {
      const generation = panel.querySelector('.demo-col.ours video');
      const column = document.createElement('div');
      column.className = 'demo-col source';
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.src = generation.getAttribute('src').replace('_generation.mp4', '_source.mp4');
      column.append(video);
      panel.querySelector('.demo-row').prepend(column);
      const label = document.createElement('div');
      label.className = 'source-label';
      label.textContent = 'Source';
      panel.querySelector('.demo-head').prepend(label);
    }
    panel.querySelector('.demo-row').classList.add('cols4');
    panel.querySelector('.demo-head').classList.add('cols4');
    const title = panel.querySelector('.demo-title');
    const scene = title.textContent.match(/Scene \d+/)[0];
    const offset = title.querySelector('.shift-offset');
    title.hidden = true;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', scene);
    panel.querySelectorAll('.demo-head > div').forEach((label) => {
      label.textContent = label.classList.contains('source-label') ? 'Source'
        : label.classList.contains('ours-label') ? 'Ours'
        : label.textContent.includes('3DGS') ? '3DGS' : 'LiDAR';
    });
    return offset ? `${scene} ${offset.textContent.trim()}` : scene;
  });

  let active = 0;
  function select(index) {
    active = (index + panels.length) % panels.length;
    panels.forEach((panel, i) => {
      if (i !== active) panel.querySelectorAll('video').forEach((video) => video.pause());
      panel.hidden = i !== active;
    });
    controls.update(active);
    transport.pause();
    transport.reset();
  }

  const controls = window.createSceneControls({ toolbar, content, labels, onSelect: select });
  const transport = window.createSyncTransport({
    getVideos: () => [...panels[active].querySelectorAll('video')],
  });
  content.parentElement.after(transport.el);
  group.classList.add('scene-switcher');
  select(0);
});
