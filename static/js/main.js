let currentZone = null;
let radioStationsData = [];
let refreshInterval = null;
let volumeDebounceTimer = null;
let volumeChanging = false;
let sleepTimerInterval = null;
let sleepTimerServerSeconds = null;
let sleepTimerLocalEpoch = null;

function getZone() {
    const zoneSelect = document.getElementById('zoneSelect');
    if (zoneSelect && zoneSelect.value) return zoneSelect.value;
    const radioZone = document.getElementById('zoneSelectForRadio');
    if (radioZone && radioZone.value) return radioZone.value;
    const modalZone = document.getElementById('zoneSelectModal');
    if (modalZone && modalZone.value) return modalZone.value;
    return currentZone;
}

function onZoneChange() {
    const zoneSelect = document.getElementById('zoneSelect');
    const value = zoneSelect ? zoneSelect.value : null;
    currentZone = value;
    if (value) {
        showNotification('已选择: ' + value);
    }
    const radioZone = document.getElementById('zoneSelectForRadio');
    if (radioZone) radioZone.value = value || '';
    const modalZone = document.getElementById('zoneSelectModal');
    if (modalZone) modalZone.value = value || '';
}

function toggleTheme() {
    const body = document.body;
    const themeIcon = document.querySelector('.theme-icon');
    const isLight = body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeIcon.textContent = isLight ? '☀️' : '🌙';
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = document.querySelector('.theme-icon');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeIcon.textContent = '☀️';
    } else {
        themeIcon.textContent = '🌙';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    const jsonScript = document.getElementById('radioStationsJson');
    if (jsonScript) {
        try {
            radioStationsData = JSON.parse(jsonScript.textContent);
        } catch (e) {
            console.error('Failed to parse radio stations JSON:', e);
            radioStationsData = [];
        }
    }
    
    const zoneSelect = document.getElementById('zoneSelect');
    if (zoneSelect && zoneSelect.options.length === 2) {
        zoneSelect.value = zoneSelect.options[1].value;
        currentZone = zoneSelect.value;
        onZoneChange();
    }
    
    checkTransitioningAndRefresh();
    startAutoRefresh();
    document.getElementById('radioList').addEventListener('click', function(e) {
        const target = e.target.closest('.radio-action-btn');
        if (!target) return;
        
        const listItem = target.closest('.radio-list-item');
        const stationId = parseInt(listItem.dataset.id);
        
        if (target.classList.contains('edit')) {
            const title = target.dataset.title;
            const url = target.dataset.url;
            openEditModal(stationId, title, url);
        } else if (target.classList.contains('delete')) {
            deleteRadioStation(stationId);
        }
    });
});

function playSelectedRadio() {
    const select = document.getElementById('radioSelect');
    const stationId = select.value;
    if (!stationId) {
        alert('请先选择一个电台');
        return;
    }
    const zone = document.getElementById('zoneSelectForRadio').value || getZone();
    if (!zone) {
        alert('请先选择目标扬声器');
        return;
    }
    const station = radioStationsData.find(s => s.id == stationId);
    if (station) {
        playUrlWithTitle(station.url, station.title, zone);
    }
}

function playUrlWithTitle(url, title, zone) {
    const targetZone = zone || getZone();
    if (!targetZone) {
        showNotification('请先选择目标扬声器');
        return;
    }
    fetch('/api/speaker/' + encodeURIComponent(targetZone) + '/play_url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url, title: title })
    })
    .then(r => r.json())
    .then(d => {
        if (d.exit_code === 0 || d.success) {
            showNotification('已播放: ' + title + ' → ' + targetZone);
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            showNotification('播放失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(e => showNotification('请求失败: ' + e));
}

function playUrl() {
    const url = document.getElementById('urlInput').value.trim();
    const title = document.getElementById('titleInput').value.trim() || '自定义音频';
    const zone = document.getElementById('zoneSelectModal').value;
    if (!url) {
        alert('请输入有效的 URL');
        return;
    }
    if (!zone) {
        alert('请选择目标扬声器');
        return;
    }
    closePlayUrlModal();
    playUrlWithTitle(url, title, zone);
}

function openPlayUrlModal() {
    const zone = getZone();
    if (zone) {
        document.getElementById('zoneSelectModal').value = zone;
    }
    document.getElementById('playUrlModal').classList.add('active');
}

function closePlayUrlModal() {
    document.getElementById('playUrlModal').classList.remove('active');
    document.getElementById('urlInput').value = '';
    document.getElementById('titleInput').value = '';
}

function openAddModal() {
    document.getElementById('addModal').classList.add('active');
}

function closeAddModal() {
    document.getElementById('addModal').classList.remove('active');
    document.getElementById('addTitleInput').value = '';
    document.getElementById('addUrlInput').value = '';
}

function openEditModal(id, title, url) {
    document.getElementById('editId').value = id;
    document.getElementById('editTitleInput').value = title;
    document.getElementById('editUrlInput').value = url;
    document.getElementById('editModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    document.getElementById('editId').value = '';
    document.getElementById('editTitleInput').value = '';
    document.getElementById('editUrlInput').value = '';
}

function addRadioStation() {
    const title = document.getElementById('addTitleInput').value.trim();
    const url = document.getElementById('addUrlInput').value.trim();
    if (!title || !url) {
        alert('请填写所有字段');
        return;
    }
    fetch('/api/radio_stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url })
    })
    .then(r => r.json())
    .then(d => {
        if (d.success) {
            closeAddModal();
            showNotification('添加成功');
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            alert('添加失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(e => alert('请求失败: ' + e));
}

function updateRadioStation() {
    const id = document.getElementById('editId').value;
    const title = document.getElementById('editTitleInput').value.trim();
    const url = document.getElementById('editUrlInput').value.trim();
    if (!id || !title || !url) {
        alert('请填写所有字段');
        return;
    }
    fetch('/api/radio_stations/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url })
    })
    .then(r => r.json())
    .then(d => {
        if (d.success) {
            closeEditModal();
            showNotification('更新成功');
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            alert('更新失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(e => alert('请求失败: ' + e));
}

function deleteRadioStation(id) {
    if (!confirm('确定要删除这个电台吗？')) return;
    fetch('/api/radio_stations/' + id, { method: 'DELETE' })
    .then(r => r.json())
    .then(d => {
        if (d.success) {
            showNotification('已删除');
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            alert('删除失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(e => alert('请求失败: ' + e));
}

function togglePlay() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    const playBtn = document.getElementById('mainPlayBtn');
    fetch('/api/speaker/' + encodeURIComponent(zone) + '/toggle_play', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
        if (d.success) {
            showNotification(d.playing ? '已播放' : '已暂停');
            if (playBtn) {
                playBtn.textContent = d.playing ? '❚❚' : '▶';
            }
            setTimeout(function() { refreshPagePartial(); }, 300);
        }
    })
    .catch(e => showNotification('操作失败'));
}

function stopPlayback() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    fetch('/api/speaker/' + encodeURIComponent(zone) + '/stop', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
        if (d.exit_code === 0 || d.success) {
            showNotification('已停止');
            setTimeout(function() { refreshPagePartial(); }, 300);
        }
    })
    .catch(e => showNotification('操作失败'));
}

function adjustVolume(delta) {
    var volumeSlider = document.getElementById('mainVolume');
    if (!volumeSlider) return;
    var newValue = parseInt(volumeSlider.value) + delta;
    newValue = Math.max(0, Math.min(100, newValue));
    volumeSlider.value = newValue;
    commitVolume(newValue);
}

function commitVolume(value) {
    var volumeValue = document.getElementById('volumeValue');
    if (volumeValue) {
        volumeValue.textContent = value + '%';
    }
    volumeChanging = true;
    clearTimeout(volumeDebounceTimer);
    volumeDebounceTimer = setTimeout(function() {
        sendVolumeToServer(value);
    }, 300);
}

function sendVolumeToServer(value) {
    var zone = getZone();
    if (!zone) return;
    fetch('/api/speaker/' + encodeURIComponent(zone) + '/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: parseInt(value) })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        volumeChanging = false;
        if (d.exit_code === 0 || d.success) {
            refreshPagePartial();
        }
    })
    .catch(function() { volumeChanging = false; });
}

function nextTrack() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    fetch('/api/speaker/' + encodeURIComponent(zone) + '/next', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
        if (d.exit_code === 0 || d.success) {
            showNotification('已切换到下一曲');
            setTimeout(function() { refreshPagePartial(); }, 300);
        }
    })
    .catch(e => showNotification('操作失败'));
}

function previousTrack() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    fetch('/api/speaker/' + encodeURIComponent(zone) + '/previous', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
        if (d.exit_code === 0 || d.success) {
            showNotification('已切换到上一曲');
            setTimeout(function() { refreshPagePartial(); }, 300);
        }
    })
    .catch(e => showNotification('操作失败'));
}

function setVolume(value) {
    if (!getZone()) {
        showNotification('请先选择扬声器');
        return;
    }
    commitVolume(value);
}

function toggleMute() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    fetch('/api/speaker/' + encodeURIComponent(zone) + '/toggle_mute', { method: 'POST' })
    .then(r => r.json())
    .then(d => {
        if (d.success) {
            const btn = document.getElementById('mainMuteBtn');
            btn.classList.toggle('muted', d.muted);
            btn.textContent = d.muted ? '🔇' : '🔊';
            showNotification(d.muted ? '已静音' : '已取消静音');
            
            const volDown = document.getElementById('volumeDownBtn');
            const volUp = document.getElementById('volumeUpBtn');
            const volumeSlider = document.getElementById('mainVolume');
            
            if (volDown) {
                volDown.classList.toggle('disabled', d.muted);
                volDown.disabled = d.muted;
            }
            if (volUp) {
                volUp.classList.toggle('disabled', d.muted);
                volUp.disabled = d.muted;
            }
            if (volumeSlider) {
                volumeSlider.classList.toggle('disabled', d.muted);
                volumeSlider.disabled = d.muted;
            }
            
            refreshPagePartial();
        }
    })
    .catch(e => showNotification('操作失败'));
}

function showNotification(msg) {
    const n = document.createElement('div');
    n.textContent = msg;
    n.style.cssText = 'position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:12px 24px;border-radius:8px;font-size:0.9rem;z-index:3000;animation:fadeIn 0.3s';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2500);
}

function formatSleepTime(totalSeconds) {
    if (totalSeconds === null || totalSeconds === undefined || totalSeconds <= 0) return '--:--';
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    if (h > 0) {
        return h + 'h ' + (m < 10 ? '0' : '') + m + 'm';
    }
    return m + ':' + (s < 10 ? '0' : '') + s;
}

function displaySleepTimer(serverSeconds) {
    if (serverSeconds === null || serverSeconds === undefined) {
        document.getElementById('sleepTimerStatus').textContent = '--';
        document.getElementById('sleepCancelBtn').classList.add('hidden');
        document.getElementById('sleepTimerCountdown').textContent = '';
        return;
    }
    sleepTimerServerSeconds = serverSeconds;
    sleepTimerLocalEpoch = Date.now();
    updateSleepTimerCountdown();
    startSleepTimerCountdown();
}

function updateSleepTimerCountdown() {
    if (sleepTimerServerSeconds === null) return;
    var elapsed = Math.floor((Date.now() - sleepTimerLocalEpoch) / 1000);
    var remaining = Math.max(0, sleepTimerServerSeconds - elapsed);
    var statusEl = document.getElementById('sleepTimerStatus');
    if (statusEl) statusEl.textContent = formatSleepTime(remaining);
    document.getElementById('sleepCancelBtn').classList.remove('hidden');
    var countdownEl = document.getElementById('sleepTimerCountdown');
    if (countdownEl) {
        if (remaining <= 0) {
            countdownEl.textContent = ' 已到期';
        } else if (remaining <= 60) {
            countdownEl.textContent = ' (' + remaining + 's后)';
        } else {
            countdownEl.textContent = '';
        }
    }
}

function startSleepTimerCountdown() {
    stopSleepTimerCountdown();
    if (sleepTimerServerSeconds === null) return;
    sleepTimerInterval = setInterval(function() {
        updateSleepTimerCountdown();
    }, 1000);
}

function stopSleepTimerCountdown() {
    if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
    }
}

function setSleepTimer(minutes) {
    var zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    fetch('/api/speaker/' + encodeURIComponent(zone) + '/sleep_timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', duration: minutes * 60 })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.success) {
            showNotification('定时关闭: ' + minutes + ' 分钟');
            displaySleepTimer(minutes * 60);
        } else {
            showNotification('设置失败: ' + (d.error || ''));
        }
    })
    .catch(function() { showNotification('设置失败'); });
}

function cancelSleepTimer() {
    var zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    fetch('/api/speaker/' + encodeURIComponent(zone) + '/sleep_timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.success) {
            showNotification('已取消定时关闭');
            stopSleepTimerCountdown();
            sleepTimerServerSeconds = null;
            document.getElementById('sleepTimerStatus').textContent = '--';
            document.getElementById('sleepCancelBtn').classList.add('hidden');
            document.getElementById('sleepTimerCountdown').textContent = '';
        } else {
            showNotification('取消失败: ' + (d.error || ''));
        }
    })
    .catch(function() { showNotification('取消失败'); });
}

function updateCardSurgically(oldCard, newCard) {
    oldCard.className = newCard.className;

    var oldState = oldCard.querySelector('.speaker-state');
    var newState = newCard.querySelector('.speaker-state');
    if (oldState && newState) {
        if (oldState.className !== newState.className) {
            oldState.className = newState.className;
        }
        if (oldState.textContent !== newState.textContent) {
            oldState.textContent = newState.textContent;
        }
    }

    var oldTrackInfo = oldCard.querySelector('.track-info');
    var newTrackInfo = newCard.querySelector('.track-info');
    if (newTrackInfo) {
        if (oldTrackInfo) {
            if (oldTrackInfo.innerHTML !== newTrackInfo.innerHTML) {
                oldTrackInfo.innerHTML = newTrackInfo.innerHTML;
            }
        } else {
            var header = oldCard.querySelector('.speaker-header');
            if (header && header.nextSibling) {
                oldCard.insertBefore(newTrackInfo, header.nextSibling);
            } else {
                oldCard.appendChild(newTrackInfo);
            }
        }
    } else if (oldTrackInfo) {
        oldTrackInfo.parentNode.removeChild(oldTrackInfo);
    }

    var oldDetails = oldCard.querySelector('.speaker-details');
    var newDetails = newCard.querySelector('.speaker-details');
    if (oldDetails && newDetails) {
        var oldValues = oldDetails.querySelectorAll('.detail-value');
        var newValues = newDetails.querySelectorAll('.detail-value');
        for (var i = 0; i < Math.min(oldValues.length, newValues.length); i++) {
            if (oldValues[i].textContent !== newValues[i].textContent) {
                oldValues[i].textContent = newValues[i].textContent;
            }
        }
    }
}

function refreshPagePartial(callback) {
    fetch('/')
    .then(r => r.text())
    .then(html => {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        
        var newCards = doc.querySelectorAll('.speaker-card');
        var oldCards = document.querySelectorAll('.speaker-card');
        var speakersSection = document.querySelector('.speakers-section');
        
        var oldCardMap = {};
        oldCards.forEach(function(card) {
            oldCardMap[card.getAttribute('data-speaker-name')] = card;
        });
        
        var seenNames = {};
        newCards.forEach(function(newCard) {
            var name = newCard.getAttribute('data-speaker-name');
            seenNames[name] = true;
            var oldCard = oldCardMap[name];
            if (oldCard) {
                updateCardSurgically(oldCard, newCard);
            } else {
                var h2 = speakersSection.querySelector('h2');
                speakersSection.insertBefore(newCard, h2 ? h2.nextSibling : speakersSection.firstChild);
            }
        });
        
        Object.keys(oldCardMap).forEach(function(name) {
            if (!seenNames[name]) {
                var card = oldCardMap[name];
                if (card.parentNode) card.parentNode.removeChild(card);
            }
        });
        
        var newTrackInfo = doc.querySelector('#playerTrackInfo');
        var oldTrackInfo = document.querySelector('#playerTrackInfo');
        if (newTrackInfo && oldTrackInfo && newTrackInfo.innerHTML !== oldTrackInfo.innerHTML) {
            var newTitle = newTrackInfo.querySelector('.player-title');
            var oldTitle = oldTrackInfo.querySelector('.player-title');
            var newArtist = newTrackInfo.querySelector('.player-artist');
            var oldArtist = oldTrackInfo.querySelector('.player-artist');

            if (newTitle && oldTitle && newTitle.textContent !== oldTitle.textContent) {
                oldTitle.classList.add('switching');
                setTimeout(function() {
                    oldTitle.textContent = newTitle.textContent;
                    oldTitle.classList.remove('switching');
                }, 200);
            }

            if (newArtist && oldArtist && newArtist.textContent !== oldArtist.textContent) {
                oldArtist.classList.add('switching');
                setTimeout(function() {
                    oldArtist.textContent = newArtist.textContent;
                    oldArtist.classList.remove('switching');
                }, 200);
            }
        }
        
        var newPlayBtn = doc.querySelector('#mainPlayBtn');
        var oldPlayBtn = document.querySelector('#mainPlayBtn');
        if (newPlayBtn && oldPlayBtn && newPlayBtn.textContent !== oldPlayBtn.textContent) {
            oldPlayBtn.style.transform = 'scale(0.8)';
            setTimeout(function() {
                oldPlayBtn.textContent = newPlayBtn.textContent;
                oldPlayBtn.style.transform = 'scale(1)';
            }, 100);
        }
        
        var newMuteBtn = doc.querySelector('#mainMuteBtn');
        var oldMuteBtn = document.querySelector('#mainMuteBtn');
        if (newMuteBtn && oldMuteBtn) {
            if (newMuteBtn.textContent !== oldMuteBtn.textContent) {
                oldMuteBtn.textContent = newMuteBtn.textContent;
            }
            if (newMuteBtn.classList.contains('muted') !== oldMuteBtn.classList.contains('muted')) {
                oldMuteBtn.classList.toggle('muted', newMuteBtn.classList.contains('muted'));
            }
        }
        
        var isMuted = newMuteBtn ? newMuteBtn.classList.contains('muted') : false;
        ['volumeDownBtn', 'volumeUpBtn'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.classList.toggle('disabled', isMuted);
                el.disabled = isMuted;
            }
        });
        
        var newVolumeSlider = doc.querySelector('#mainVolume');
        var oldVolumeSlider = document.querySelector('#mainVolume');
        if (newVolumeSlider && oldVolumeSlider) {
            oldVolumeSlider.classList.toggle('disabled', isMuted);
            oldVolumeSlider.disabled = isMuted;
            if (!volumeChanging && newVolumeSlider.value !== oldVolumeSlider.value) {
                oldVolumeSlider.value = newVolumeSlider.value;
            }
        }
        
        var newVolumeValue = doc.querySelector('#volumeValue');
        var oldVolumeValue = document.querySelector('#volumeValue');
        if (newVolumeValue && oldVolumeValue && !volumeChanging && newVolumeValue.textContent !== oldVolumeValue.textContent) {
            oldVolumeValue.textContent = newVolumeValue.textContent;
        }
        
        var newZoneSelect = doc.querySelector('#zoneSelect');
        var oldZoneSelect = document.querySelector('#zoneSelect');
        if (newZoneSelect && oldZoneSelect && newZoneSelect.innerHTML !== oldZoneSelect.innerHTML) {
            var savedValue = currentZone || oldZoneSelect.value;
            oldZoneSelect.innerHTML = newZoneSelect.innerHTML;
            if (savedValue) oldZoneSelect.value = savedValue;
        }

        var newRadioCount = doc.querySelector('.radio-station-count');
        var oldRadioCount = document.querySelector('.radio-station-count');
        if (newRadioCount && oldRadioCount && newRadioCount.textContent !== oldRadioCount.textContent) {
            oldRadioCount.textContent = newRadioCount.textContent;
        }

        var newRadioSelect = doc.querySelector('#radioSelect');
        var oldRadioSelect = document.querySelector('#radioSelect');
        if (newRadioSelect && oldRadioSelect && newRadioSelect.innerHTML !== oldRadioSelect.innerHTML) {
            var savedRadioValue = oldRadioSelect.value;
            oldRadioSelect.innerHTML = newRadioSelect.innerHTML;
            if (savedRadioValue) oldRadioSelect.value = savedRadioValue;
        }

        var newRadioList = doc.querySelector('#radioList');
        var oldRadioList = document.querySelector('#radioList');
        if (newRadioList && oldRadioList && newRadioList.innerHTML !== oldRadioList.innerHTML) {
            oldRadioList.innerHTML = newRadioList.innerHTML;
        }

        var newRadioJson = doc.querySelector('#radioStationsJson');
        var oldRadioJson = document.querySelector('#radioStationsJson');
        if (newRadioJson && oldRadioJson && newRadioJson.textContent !== oldRadioJson.textContent) {
            oldRadioJson.textContent = newRadioJson.textContent;
            try {
                radioStationsData = JSON.parse(newRadioJson.textContent);
            } catch (e) {}
        }

        var newSleepStatus = doc.querySelector('#sleepTimerStatus');
        if (newSleepStatus && sleepTimerServerSeconds === null) {
            var newSec = parseInt(newSleepStatus.getAttribute('data-sleep-seconds'));
            if (newSec > 0) {
                displaySleepTimer(newSec);
            }
        }

        if (callback) callback();
    });
}

function checkTransitioningAndRefresh() {
    const transitioningCards = document.querySelectorAll('.speaker-card .speaker-state.state-transitioning');
    if (transitioningCards.length > 0) {
        setTimeout(function() {
            refreshPagePartial(function() {
                checkTransitioningAndRefresh();
            });
        }, 500);
    }
}

function startAutoRefresh() {
    refreshInterval = setInterval(function() {
        refreshPagePartial();
    }, 1000);
}
