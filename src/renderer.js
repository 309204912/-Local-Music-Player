(() => {
  const audio = new Audio();
  let playlist = [];
  let currentIndex = -1;
  let isLocked = true;
  let ghostMode = false;
  let playMode = 'loop'; // loop | one | seq | shuffle
  let folders = [];
  let currentFolder = '';
  let musicRoot = '';

  // Elements
  const $ = id => document.getElementById(id);
  const lockBtn = $('lock-btn');
  const lockIcon = $('lock-icon');
  const unlockIcon = $('unlock-icon');
  const folderSelect = $('folder-select');
  const progressBar = $('progress-bar');
  const progressFill = $('progress-fill');
  const progressThumb = $('progress-thumb');
  const timeCurrent = $('time-current');
  const timeTotal = $('time-total');
  const playBtn = $('play-btn');
  const iconPlay = $('icon-play');
  const iconPause = $('icon-pause');
  const prevBtn = $('prev-btn');
  const nextBtn = $('next-btn');
  const modeBtn = $('mode-btn');
  const volBtn = $('vol-btn');
  const playlistEl = $('playlist');
  const appEl = $('app');

  // ---- Init ----
  async function init() {
    try {
      musicRoot = await api.getMusicRoot();
      folders = await api.scanFolders();
      isLocked = await api.getLocked();

      updateLockUI();
      populateFolderSelect();

      if (folders.length > 0) {
        // find first folder with audio files
        let defaultFolder = folders[0];
        for (const f of folders) {
          const files = await api.scanAudioFiles(f);
          if (files.length > 0) { defaultFolder = f; break; }
        }
        currentFolder = defaultFolder;
        folderSelect.value = currentFolder;
        await loadPlaylist(currentFolder);
      } else {
        playlistEl.innerHTML = `
          <div class="empty-msg">
            将音频文件放入<b>music</b>子目录中
            <br><br>
            <button id="open-folder-btn" class="open-folder-btn">打开 music 文件夹</button>
            <br>
            <span style="font-size:9px;opacity:0.4">${musicRoot}</span>
          </div>`;
        setTimeout(() => {
          const btn = document.getElementById('open-folder-btn');
          if (btn) btn.onclick = () => api.openFolder('');
        }, 0);
      }

      setupEvents();
      updateModeUI();
    } catch (err) {
      playlistEl.innerHTML = `<div class="empty-msg">初始化错误<br><span style="font-size:9px;opacity:0.5">${err.message}</span></div>`;
      console.error('[MusicFloat]', err);
    }
  }

  function populateFolderSelect() {
    folderSelect.innerHTML = '';
    if (folders.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = '无可用文件夹';
      opt.disabled = true;
      folderSelect.appendChild(opt);
      return;
    }
    folders.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      folderSelect.appendChild(opt);
    });
  }

  async function loadPlaylist(folder) {
    try {
      currentFolder = folder;
      const files = await api.scanAudioFiles(folder);
      playlist = files.map(f => ({ name: f, path: `${musicRoot}/${folder}/${f}` }));
      currentIndex = -1;
      renderPlaylist();

      if (playlist.length > 0) {
        currentIndex = 0;
        loadTrack(0, false);
      }
    } catch (err) {
      console.error('[MusicFloat] loadPlaylist error:', err);
    }
  }

  function renderPlaylist() {
    if (playlist.length === 0) {
      playlistEl.innerHTML = `
        <div class="empty-msg">
          此文件夹暂无音频文件
          <br><br>
          <button id="open-folder-btn" class="open-folder-btn">打开文件夹</button>
        </div>`;
      setTimeout(() => {
        const btn = document.getElementById('open-folder-btn');
        if (btn) btn.onclick = () => api.openFolder(currentFolder);
      }, 0);
      return;
    }
    playlistEl.innerHTML = playlist.map((t, i) => `
      <div class="track-item${i === currentIndex ? ' active' : ''}" data-index="${i}">
        <span class="track-index">${String(i + 1).padStart(2, '0')}</span>
        <span class="track-name">${t.name.replace(/\.[^.]+$/, '')}</span>
      </div>
    `).join('');

    playlistEl.querySelectorAll('.track-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        loadTrack(idx, true);
      });
    });
  }

  function loadTrack(index, autoplay = true) {
    if (index < 0 || index >= playlist.length) return;
    currentIndex = index;
    const track = playlist[index];
    audio.src = track.path;
    audio.load();
    document.title = track.name.replace(/\.[^.]+$/, '');
    renderPlaylist();
    if (autoplay) {
      audio.play().catch(() => {});
      updatePlayBtnUI(true);
    }
  }

  // ---- Controls ----
  function togglePlay() {
    if (!audio.src) return;
    if (audio.paused) {
      audio.play().catch(() => {});
      updatePlayBtnUI(true);
    } else {
      audio.pause();
      updatePlayBtnUI(false);
    }
  }

  function nextTrack() {
    if (playlist.length === 0) return;
    let next;
    if (playMode === 'shuffle') {
      next = Math.floor(Math.random() * playlist.length);
    } else {
      next = (currentIndex + 1) % playlist.length;
    }
    loadTrack(next, true);
  }

  function prevTrack() {
    if (playlist.length === 0) return;
    let prev;
    if (playMode === 'shuffle') {
      prev = Math.floor(Math.random() * playlist.length);
    } else {
      prev = (currentIndex - 1 + playlist.length) % playlist.length;
    }
    loadTrack(prev, true);
  }

  const modes = ['loop', 'one', 'seq', 'shuffle'];
  function cycleMode() {
    const idx = (modes.indexOf(playMode) + 1) % modes.length;
    playMode = modes[idx];
    audio.loop = (playMode === 'one');
    updateModeUI();
  }

  function updatePlayBtnUI(playing) {
    iconPlay.style.display = playing ? 'none' : 'block';
    iconPause.style.display = playing ? 'block' : 'none';
  }

  function updateModeUI() {
    const ids = { loop: 'mode-loop', one: 'mode-one', seq: 'mode-seq', shuffle: 'mode-shuffle' };
    Object.entries(ids).forEach(([k, id]) => {
      $(id).style.display = k === playMode ? 'block' : 'none';
    });
    const titles = { loop: '列表循环', one: '单曲循环', seq: '顺序播放', shuffle: '随机播放' };
    modeBtn.title = titles[playMode];
  }

  function updateLockUI() {
    if (isLocked) {
      lockIcon.style.display = 'block';
      unlockIcon.style.display = 'none';
      lockBtn.classList.add('locked');
      appEl.classList.remove('unlocked');
    } else {
      lockIcon.style.display = 'none';
      unlockIcon.style.display = 'block';
      lockBtn.classList.remove('locked');
      appEl.classList.add('unlocked');
    }
  }

  // ---- Format time ----
  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ---- Seek bar ----
  let isDragging = false;

  function seekTo(e) {
    const rect = progressBar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (isFinite(audio.duration)) {
      audio.currentTime = pct * audio.duration;
    }
    updateProgress(pct);
  }

  function updateProgress(pct) {
    progressFill.style.width = (pct * 100) + '%';
  }

  // ---- Events ----
  function setupEvents() {
    // Lock
    lockBtn.addEventListener('click', async () => {
      isLocked = !isLocked;
      await api.setLocked(isLocked);
      updateLockUI();
    });

    // Folder select
    folderSelect.addEventListener('change', () => {
      const val = folderSelect.value;
      if (val && val !== currentFolder) {
        loadPlaylist(val);
      }
    });

    // Open folder button
    $('open-dir-btn').addEventListener('click', () => {
      api.openFolder(currentFolder || '');
    });

    // Close button
    $('close-btn').addEventListener('click', () => {
      api.closeApp();
    });

    // Ghost mode
    const ghostBtn = $('ghost-btn');
    ghostBtn.addEventListener('click', () => {
      ghostMode = !ghostMode;
      api.setGhost(ghostMode);
      appEl.classList.toggle('ghost-mode', ghostMode);
      ghostBtn.classList.toggle('active', ghostMode);
    });

    // Allow ghost button to be clickable in ghost mode
    ghostBtn.addEventListener('mouseenter', () => {
      if (ghostMode) api.setMouseForward(false);
    });
    ghostBtn.addEventListener('mouseleave', () => {
      if (ghostMode) api.setMouseForward(true);
    });

    // Play controls
    playBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', nextTrack);
    prevBtn.addEventListener('click', prevTrack);
    modeBtn.addEventListener('click', cycleMode);

    // Volume toggle
    volBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      $('vol-on').style.display = audio.muted ? 'none' : 'block';
      $('vol-off').style.display = audio.muted ? 'block' : 'none';
    });

    // Progress bar
    progressBar.addEventListener('mousedown', (e) => {
      isDragging = true;
      progressBar.classList.add('dragging');
      seekTo(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) seekTo(e);
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      progressBar.classList.remove('dragging');
    });

    // Audio events
    audio.addEventListener('timeupdate', () => {
      if (!isDragging && isFinite(audio.duration)) {
        const pct = audio.currentTime / audio.duration;
        updateProgress(pct);
        timeCurrent.textContent = fmt(audio.currentTime);
        timeTotal.textContent = fmt(audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      if (playMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else if (playMode === 'seq') {
        if (currentIndex < playlist.length - 1) {
          loadTrack(currentIndex + 1, true);
        } else {
          updatePlayBtnUI(false);
        }
      } else {
        nextTrack();
      }
    });

    audio.addEventListener('loadedmetadata', () => {
      timeTotal.textContent = fmt(audio.duration);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    });

    // ---- Resize (bottom-right corner, unlocked only) ----
    const RESIZE_ZONE = 16;
    let resizing = false;
    let resizeStart = { x: 0, y: 0 };
    let resizeInitW = 0;
    let resizeInitH = 0;

    document.addEventListener('mousemove', (e) => {
      if (isLocked) return;
      if (resizing) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const nearRight = e.clientX > vw - RESIZE_ZONE;
      const nearBottom = e.clientY > vh - RESIZE_ZONE;
      if (nearRight && nearBottom) {
        appEl.style.cursor = 'nwse-resize';
      } else {
        appEl.style.cursor = '';
      }
    });

    appEl.addEventListener('mousedown', (e) => {
      if (isLocked) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const nearRight = e.clientX > vw - RESIZE_ZONE;
      const nearBottom = e.clientY > vh - RESIZE_ZONE;
      if (nearRight && nearBottom) {
        resizing = true;
        resizeStart = { x: e.screenX, y: e.screenY };
        resizeInitW = vw;
        resizeInitH = vh;
        e.preventDefault();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const dx = e.screenX - resizeStart.x;
      const dy = e.screenY - resizeStart.y;
      const newW = resizeInitW + dx;
      const newH = resizeInitH + dy;
      api.setWindowSize(newW, newH);
    });

    document.addEventListener('mouseup', () => {
      if (resizing) {
        resizing = false;
        appEl.style.cursor = '';
      }
    });
  }

  // Boot
  init();
})();
