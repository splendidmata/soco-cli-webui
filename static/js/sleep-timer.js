let sleepTimerInterval = null;
let sleepTimerServerSeconds = null;
let sleepTimerLocalEpoch = null;
let sleepPendingFlag = false;

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
    if (sleepPendingFlag) return;
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
    if (sleepPendingFlag) return;
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

function setSleepPending() {
    stopSleepTimerCountdown();
    sleepTimerServerSeconds = null;
    sleepPendingFlag = true;
    var statusEl = document.getElementById('sleepTimerStatus');
    var countdownEl = document.getElementById('sleepTimerCountdown');
    if (statusEl) statusEl.classList.add('sleep-pending');
    if (countdownEl) countdownEl.textContent = '';
    disableSleepButtons(true);
}

function clearSleepPending() {
    sleepPendingFlag = false;
    var statusEl = document.getElementById('sleepTimerStatus');
    if (statusEl) statusEl.classList.remove('sleep-pending');
    disableSleepButtons(false);
}

function disableSleepButtons(disabled) {
    var buttons = document.querySelectorAll('.sleep-preset-btn, .sleep-cancel-btn');
    buttons.forEach(function(btn) {
        btn.disabled = disabled;
        btn.style.opacity = disabled ? '0.5' : '';
        btn.style.pointerEvents = disabled ? 'none' : '';
    });
}

function setSleepTimer(minutes) {
    var zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }

    setSleepPending();

    fetch('/api/speaker/' + encodeURIComponent(zone) + '/sleep_timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', duration: minutes * 60 })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        clearSleepPending();
        if (d.success) {
            showNotification('定时关闭: ' + minutes + ' 分钟');
            displaySleepTimer(d.sleep_timer);
        } else {
            showNotification('设置失败: ' + (d.error || ''));
        }
    })
    .catch(function() {
        clearSleepPending();
        showNotification('设置失败');
    });
}

function cancelSleepTimer() {
    var zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }

    setSleepPending();

    fetch('/api/speaker/' + encodeURIComponent(zone) + '/sleep_timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        clearSleepPending();
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
    .catch(function() {
        clearSleepPending();
        showNotification('取消失败');
    });
}
