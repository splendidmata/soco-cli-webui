let currentZone = null;
let apiPending = false;

function getZone() {
    const zoneSelect = document.getElementById('zoneSelect');
    if (zoneSelect && zoneSelect.value) return zoneSelect.value;
    const radioZone = document.getElementById('zoneSelectForRadio');
    if (radioZone && radioZone.value) return radioZone.value;
    const modalZone = document.getElementById('zoneSelectModal');
    if (modalZone && modalZone.value) return modalZone.value;
    return currentZone;
}

function apiCall(url, method) {
    apiPending = true;
    method = method || 'POST';
    return fetch(url, { method: method })
        .then(function(r) { return r.json(); })
        .finally(function() { apiPending = false; });
}

function showNotification(msg) {
    var n = document.createElement('div');
    n.textContent = msg;
    n.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:12px 24px;border-radius:8px;font-size:0.9rem;z-index:3000;animation:fadeIn 0.3s';
    document.body.appendChild(n);
    setTimeout(function() {
        n.style.opacity = '0';
        n.style.transition = 'opacity 0.3s';
        setTimeout(function() { document.body.removeChild(n); }, 300);
    }, 2000);
}

function pollState() {
    if (apiPending) return;
    fetch('/api/poll')
    .then(function(r) { return r.json(); })
    .then(function(d) {
        updateCardsFromPoll(d.speakers);
        updatePlayerFromPoll(d.speakers);
        updateSleepTimerFromPoll(d.sleep_timer);
        updateRadioFromPoll(d);
    });
}

function updateCardsFromPoll(speakers) {
    var cardMap = {};
    document.querySelectorAll('.speaker-card').forEach(function(card) {
        cardMap[card.getAttribute('data-speaker-name')] = card;
    });
    var seen = {};
    speakers.forEach(function(sp) {
        seen[sp.name] = true;
        var card = cardMap[sp.name];
        if (card) {
            var stateEl = card.querySelector('.speaker-state');
            if (stateEl && sp.state) {
                var newClass = 'speaker-state state-' + sp.state.toLowerCase();
                if (stateEl.className !== newClass) stateEl.className = newClass;
            }
            var stateText = card.querySelector('.state-text');
            if (stateText) {
                var labelMap = { 'PLAYING': '播放中', 'PAUSED': '已暂停', 'STOPPED': '已停止', 'TRANSITIONING': '切换中' };
                var label = labelMap[sp.state] || '未知';
                if (stateText.textContent !== label) stateText.textContent = label;
            }
            var trackInfo = card.querySelector('.track-info');
            if (trackInfo) {
                var titleEl = trackInfo.querySelector('.track-title');
                var artistEl = trackInfo.querySelector('.track-artist');
                if (titleEl && sp.track && titleEl.textContent !== sp.track) {
                    titleEl.textContent = sp.track;
                }
                if (artistEl) {
                    var newArtist = sp.artist || '';
                    if (artistEl.textContent !== newArtist) artistEl.textContent = newArtist;
                }
            }
            var details = card.querySelector('.speaker-details');
            if (details && sp.volume !== undefined) {
                var detailValues = details.querySelectorAll('.detail-value');
                if (detailValues.length >= 1) {
                    if (sp.volume !== null && detailValues[0].textContent !== String(sp.volume)) {
                        detailValues[0].textContent = sp.volume + '%';
                    }
                }
            }
        }
    });
    Object.keys(cardMap).forEach(function(name) {
        if (!seen[name] && cardMap[name].parentNode) {
            cardMap[name].parentNode.removeChild(cardMap[name]);
        }
    });
}

function updatePlayerFromPoll(speakers) {
    var sp0 = speakers[0];
    if (!sp0) return;
    var trackInfo = document.getElementById('playerTrackInfo');
    if (trackInfo) {
        var titleEl = trackInfo.querySelector('.player-title');
        var artistEl = trackInfo.querySelector('.player-artist');
        if (titleEl && sp0.track) {
            if (titleEl.textContent !== sp0.track) {
                titleEl.classList.add('switching');
                setTimeout(function() { titleEl.textContent = sp0.track; titleEl.classList.remove('switching'); }, 200);
            }
        }
        if (artistEl) {
            var newArtist = sp0.artist || '暂无播放内容';
            if (artistEl.textContent !== newArtist) {
                artistEl.classList.add('switching');
                setTimeout(function() { artistEl.textContent = newArtist; artistEl.classList.remove('switching'); }, 200);
            }
        }
    }
    var playBtn = document.getElementById('mainPlayBtn');
    if (playBtn && sp0.state) {
        var btnText = sp0.state === 'PLAYING' ? '❚❚' : sp0.state === 'TRANSITIONING' ? '~' : '▶';
        if (playBtn.textContent !== btnText) {
            playBtn.style.transform = 'scale(0.8)';
            setTimeout(function() { playBtn.textContent = btnText; playBtn.style.transform = 'scale(1)'; }, 100);
        }
    }
    var muteBtn = document.getElementById('mainMuteBtn');
    if (muteBtn && sp0.mute !== undefined) {
        muteBtn.classList.toggle('muted', sp0.mute);
        muteBtn.textContent = sp0.mute ? '🔇' : '🔊';
    }
    var isMuted = sp0.mute;
    var volumeSlider = document.getElementById('mainVolume');
    if (volumeSlider && sp0.volume !== undefined && !volumeChanging) {
        volumeSlider.classList.toggle('disabled', isMuted);
        volumeSlider.disabled = isMuted;
        if (parseInt(volumeSlider.value) !== sp0.volume) volumeSlider.value = sp0.volume;
    }
    var volumeValue = document.getElementById('volumeValue');
    if (volumeValue && !volumeChanging) {
        volumeValue.textContent = isMuted ? '静音' : (sp0.volume || 50) + '%';
    }
    ['volumeDownBtn', 'volumeUpBtn'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.classList.toggle('disabled', isMuted); el.disabled = isMuted; }
    });
    var crossfadeBtn = document.getElementById('mainCrossfadeBtn');
    if (crossfadeBtn && sp0.cross_fade !== undefined) {
        crossfadeBtn.classList.toggle('active', sp0.cross_fade);
    }
    var zoneSelect = document.getElementById('zoneSelect');
    if (zoneSelect && !zoneSelect.value) {
        zoneSelect.value = sp0.name || '';
        currentZone = sp0.name;
    }
}

function updateSleepTimerFromPoll(stInfo) {
    if (!stInfo) return;
    if (stInfo.active && stInfo.seconds > 0) {
        if (sleepTimerServerSeconds === null || Math.abs(stInfo.seconds - sleepTimerServerSeconds) > 3) {
            displaySleepTimer(stInfo.seconds);
        }
    } else if (!stInfo.active && sleepTimerServerSeconds !== null) {
        stopSleepTimerCountdown();
        sleepTimerServerSeconds = null;
        var statusEl = document.getElementById('sleepTimerStatus');
        var cancelBtn = document.getElementById('sleepCancelBtn');
        var countdownEl = document.getElementById('sleepTimerCountdown');
        if (statusEl) statusEl.textContent = '--';
        if (cancelBtn) cancelBtn.classList.add('hidden');
        if (countdownEl) countdownEl.textContent = '';
    }
}

function updateRadioFromPoll(d) {
}

function refreshPagePartial(callback) {
    pollState();
    if (callback) setTimeout(callback, 100);
}

function startAutoRefresh() {
    setInterval(function() { pollState(); }, 1000);
}
