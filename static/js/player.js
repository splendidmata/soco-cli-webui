let volumeDebounceTimer = null;
let volumeChanging = false;

function togglePlay() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/toggle_play')
    .then(function(d) {
        if (d.success) {
            showNotification(d.playing ? '已播放' : '已暂停');
            var playBtn = document.getElementById('mainPlayBtn');
            if (playBtn) playBtn.textContent = d.playing ? '❚❚' : '▶';
        }
    })
    .catch(function() { showNotification('操作失败'); });
}

function nextTrack() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/next')
    .then(function(d) {
        if (d.success) showNotification('下一曲');
    })
    .catch(function() { showNotification('操作失败'); });
}

function previousTrack() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/previous')
    .then(function(d) {
        if (d.success) showNotification('上一曲');
    })
    .catch(function() { showNotification('操作失败'); });
}

function stopPlayback() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/stop')
    .then(function(d) {
        if (d.success) showNotification('已停止');
    })
    .catch(function() { showNotification('操作失败'); });
}

function toggleMute() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/toggle_mute')
    .then(function(d) {
        if (d.success) {
            var btn = document.getElementById('mainMuteBtn');
            btn.classList.toggle('muted', d.muted);
            btn.textContent = d.muted ? '🔇' : '🔊';
            showNotification(d.muted ? '已静音' : '已取消静音');
            var volDown = document.getElementById('volumeDownBtn');
            var volUp = document.getElementById('volumeUpBtn');
            var volumeSlider = document.getElementById('mainVolume');
            if (volDown) { volDown.classList.toggle('disabled', d.muted); volDown.disabled = d.muted; }
            if (volUp) { volUp.classList.toggle('disabled', d.muted); volUp.disabled = d.muted; }
            if (volumeSlider) { volumeSlider.classList.toggle('disabled', d.muted); volumeSlider.disabled = d.muted; }
        }
    })
    .catch(function() { showNotification('操作失败'); });
}

function toggleCrossfade() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/toggle_crossfade')
    .then(function(d) {
        if (d.success) {
            var btn = document.getElementById('mainCrossfadeBtn');
            btn.classList.toggle('active', d.cross_fade);
            showNotification(d.cross_fade ? '已开启淡入淡出' : '已关闭淡入淡出');
        }
    })
    .catch(function() { showNotification('操作失败'); });
}

function adjustVolume(delta) {
    const zone = getZone();
    if (!zone) return;
    var slider = document.getElementById('mainVolume');
    if (!slider) return;
    var newVal = Math.max(0, Math.min(100, parseInt(slider.value) + delta));
    slider.value = newVal;
    var valueEl = document.getElementById('volumeValue');
    if (valueEl) valueEl.textContent = newVal + '%';
    commitVolume(newVal);
}

function setVolume(value) {
    var valueEl = document.getElementById('volumeValue');
    if (valueEl) valueEl.textContent = value + '%';
    volumeChanging = true;
    clearTimeout(volumeDebounceTimer);
    volumeDebounceTimer = setTimeout(function() {
        commitVolume(value);
    }, 300);
}

function commitVolume(value) {
    const zone = getZone();
    if (!zone) { volumeChanging = false; return; }
    fetch('/api/speaker/' + encodeURIComponent(zone) + '/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: parseInt(value) })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        volumeChanging = false;
    })
    .catch(function() { volumeChanging = false; });
}
