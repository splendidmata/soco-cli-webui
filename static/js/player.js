var volumeDebounceTimer = null;
var volumeChanging = false;
var volumeChangingHoldTimer = null;
var deployPollTimer = null;

function deployPollCheck() {
    clearTimeout(deployPollTimer);
    deployPollTimer = setTimeout(function() {
        pollState();
    }, 400);
}

function togglePlay() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    
    const playBtn = document.getElementById('mainPlayBtn');
    if (playBtn) {
        playBtn.style.transform = 'scale(0.9)';
    }
    
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/toggle_play')
    .then(function(d) {
        if (playBtn) {
            playBtn.style.transform = 'scale(1)';
        }
        
        if (d.success) {
            showNotification(d.playing ? '已播放' : '已暂停');
            if (playBtn) {
                playBtn.textContent = '~';
                playBtn.style.transform = 'scale(0.8)';
                setTimeout(function() {
                    playBtn.style.transform = 'scale(1)';
                }, 100);
            }
            var cardBtn = document.querySelector('.speaker-card[data-speaker-name="' + zone + '"] .card-play-btn');
            if (cardBtn) cardBtn.textContent = '~';
            deployPollCheck();
        }
    })
    .catch(function() { 
        if (playBtn) {
            playBtn.style.transform = 'scale(1)';
        }
        showNotification('操作失败'); 
    });
}

function nextTrack() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    
    const nextBtn = document.querySelector('.player-control-btn:last-of-type');
    if (nextBtn) {
        nextBtn.style.transform = 'scale(0.9)';
    }
    
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/next')
    .then(function(d) {
        if (nextBtn) {
            nextBtn.style.transform = 'scale(1)';
        }
        
        if (d.success) {
            showNotification('下一曲');
        }
    })
    .catch(function() { 
        if (nextBtn) {
            nextBtn.style.transform = 'scale(1)';
        }
        showNotification('操作失败'); 
    });
}

function previousTrack() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    
    const prevBtn = document.querySelector('.player-control-btn:first-of-type');
    if (prevBtn) {
        prevBtn.style.transform = 'scale(0.9)';
    }
    
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/previous')
    .then(function(d) {
        if (prevBtn) {
            prevBtn.style.transform = 'scale(1)';
        }
        
        if (d.success) {
            showNotification('上一曲');
        }
    })
    .catch(function() { 
        if (prevBtn) {
            prevBtn.style.transform = 'scale(1)';
        }
        showNotification('操作失败'); 
    });
}

function stopPlayback() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/stop')
    .then(function(d) {
        if (d.success) {
            showNotification('已停止');
        }
    })
    .catch(function() { showNotification('操作失败'); });
}

function toggleMute() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    
    const muteBtn = document.getElementById('mainMuteBtn');
    if (muteBtn) {
        muteBtn.style.transform = 'scale(0.9)';
    }
    
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/toggle_mute')
    .then(function(d) {
        if (muteBtn) {
            muteBtn.style.transform = 'scale(1)';
        }
        
        if (d.success) {
            var btn = document.getElementById('mainMuteBtn');
            btn.classList.toggle('muted', d.muted);
            btn.textContent = d.muted ? '🔇' : '🔊';
            showNotification(d.muted ? '已静音' : '已取消静音');
            
            var volDown = document.getElementById('volumeDownBtn');
            var volUp = document.getElementById('volumeUpBtn');
            var volumeSlider = document.getElementById('mainVolume');
            
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

            var cardBtn = document.querySelector('.speaker-card[data-speaker-name="' + zone + '"] .card-mute-btn');
            if (cardBtn) cardBtn.textContent = d.muted ? '🔇' : '🔊';

            deployPollCheck();
        }
    })
    .catch(function() { 
        if (muteBtn) {
            muteBtn.style.transform = 'scale(1)';
        }
        showNotification('操作失败'); 
    });
}

function toggleCrossfade() {
    const zone = getZone();
    if (!zone) {
        showNotification('请先选择扬声器');
        return;
    }
    
    const crossfadeBtn = document.getElementById('mainCrossfadeBtn');
    if (crossfadeBtn) {
        crossfadeBtn.style.transform = 'scale(0.9)';
    }
    
    apiCall('/api/speaker/' + encodeURIComponent(zone) + '/toggle_crossfade')
    .then(function(d) {
        if (crossfadeBtn) {
            crossfadeBtn.style.transform = 'scale(1)';
        }
        
        if (d.success) {
            var btn = document.getElementById('mainCrossfadeBtn');
            btn.classList.toggle('active', d.cross_fade);
            showNotification(d.cross_fade ? '已开启淡入淡出' : '已关闭淡入淡出');
        }
    })
    .catch(function() { 
        if (crossfadeBtn) {
            crossfadeBtn.style.transform = 'scale(1)';
        }
        showNotification('操作失败'); 
    });
}

function adjustVolume(delta) {
    const zone = getZone();
    if (!zone) return;

    var slider = document.getElementById('mainVolume');
    if (!slider) return;

    var newVal = Math.max(0, Math.min(100, parseInt(slider.value) + delta));
    slider.value = newVal;

    onVolumeSlide(newVal);
}

function onVolumeSlide(value) {
    var valueEl = document.getElementById('volumeValue');
    if (valueEl) valueEl.textContent = value + '%';

    volumeChanging = true;
    clearTimeout(volumeDebounceTimer);

    volumeDebounceTimer = setTimeout(function() {
        commitVolume(value);
    }, 150);
}

function setVolume(value) {
    onVolumeSlide(value);
}

function commitVolume(value) {
    clearTimeout(volumeChangingHoldTimer);
    volumeChanging = true;

    const zone = getZone();
    if (!zone) {
        volumeChanging = false;
        return;
    }

    fetch('/api/speaker/' + encodeURIComponent(zone) + '/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: parseInt(value) })
    })
    .then(function(r) { return r.json(); })
    .catch(function() {});

    volumeChangingHoldTimer = setTimeout(function() {
        volumeChanging = false;
        pollState();
    }, 800);
}

function animateVolumeChange(direction) {
    const slider = document.getElementById('mainVolume');
    if (!slider) return;
    
    const valueEl = document.getElementById('volumeValue');
    const btn = direction === 'up' ? document.getElementById('volumeUpBtn') : document.getElementById('volumeDownBtn');
    
    if (btn) {
        btn.style.transform = 'scale(0.9)';
        setTimeout(function() {
            btn.style.transform = 'scale(1)';
        }, 100);
    }
    
    if (valueEl) {
        valueEl.style.transform = 'scale(1.2)';
        valueEl.style.color = 'var(--accent)';
        setTimeout(function() {
            valueEl.style.transform = 'scale(1)';
            valueEl.style.color = '';
        }, 200);
    }
}

function highlightPlayingSpeaker(speakerName) {
    const cards = document.querySelectorAll('.speaker-card');
    cards.forEach(function(card) {
        if (card.dataset.speakerName === speakerName) {
            card.style.borderColor = 'var(--accent)';
            card.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.4)';
        } else {
            card.style.borderColor = '';
            card.style.boxShadow = '';
        }
    });
}

function cardToggleMute(speakerName) {
    var btn = document.querySelector('.speaker-card[data-speaker-name="' + speakerName + '"] .card-mute-btn');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }

    fetch('/api/speaker/' + encodeURIComponent(speakerName) + '/toggle_mute', { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.textContent = d.muted ? '🔇' : '🔊';
        }
        if (d.success) {
            if (speakerName === currentZone) {
                var mainMute = document.getElementById('mainMuteBtn');
                if (mainMute) {
                    mainMute.classList.toggle('muted', d.muted);
                    mainMute.textContent = d.muted ? '🔇' : '🔊';
                }
                ['volumeDownBtn', 'volumeUpBtn'].forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el) { el.classList.toggle('disabled', d.muted); el.disabled = d.muted; }
                });
                var volSlider = document.getElementById('mainVolume');
                if (volSlider) { volSlider.classList.toggle('disabled', d.muted); volSlider.disabled = d.muted; }
            }
            deployPollCheck();
        } else {
            showNotification('操作失败: ' + (d.error || ''));
        }
    })
    .catch(function() {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
        showNotification('操作失败');
    });
}

function cardTogglePlay(speakerName) {
    var btn = document.querySelector('.speaker-card[data-speaker-name="' + speakerName + '"] .card-play-btn');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }

    fetch('/api/speaker/' + encodeURIComponent(speakerName) + '/toggle_play', { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
        if (d.success) {
            if (btn) btn.textContent = '~';
            if (speakerName === currentZone) {
                var mainBtn = document.getElementById('mainPlayBtn');
                if (mainBtn) {
                    mainBtn.textContent = '~';
                    mainBtn.style.transform = 'scale(0.8)';
                    requestAnimationFrame(function() { mainBtn.style.transform = 'scale(1)'; });
                }
            }
            deployPollCheck();
        } else {
            showNotification('操作失败: ' + (d.error || ''));
        }
    })
    .catch(function() {
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
        showNotification('操作失败');
    });
}