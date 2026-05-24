let radioStationsData = [];

function playSelectedRadio() {
    const select = document.getElementById('radioSelect');
    const stationId = select.value;
    
    if (!stationId) {
        showNotification('请先选择一个电台');
        return;
    }
    
    const zone = document.getElementById('zoneSelectForRadio').value || getZone();
    if (!zone) {
        showNotification('请先选择目标扬声器');
        return;
    }
    
    const station = radioStationsData.find(function(s) { return s.id == stationId; });
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
    
    const playBtn = document.querySelector('.play-radio-btn');
    if (playBtn) {
        playBtn.disabled = true;
        playBtn.style.opacity = '0.7';
    }
    
    fetch('/api/speaker/' + encodeURIComponent(targetZone) + '/play_url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url, title: title })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (playBtn) {
            playBtn.disabled = false;
            playBtn.style.opacity = '1';
        }
        
        if (d.exit_code === 0 || d.success) {
            showNotification('已播放: ' + title + ' → ' + targetZone);
            updatePlayerWithRadioTitle(title);
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            showNotification('播放失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(function(e) { 
        if (playBtn) {
            playBtn.disabled = false;
            playBtn.style.opacity = '1';
        }
        showNotification('请求失败: ' + e); 
    });
}

function updatePlayerWithRadioTitle(title) {
    var playerTrackInfo = document.getElementById('playerTrackInfo');
    if (playerTrackInfo) {
        var titleEl = playerTrackInfo.querySelector('.player-title');
        var artistEl = playerTrackInfo.querySelector('.player-artist');
        if (titleEl) titleEl.textContent = title;
        if (artistEl) artistEl.textContent = '📻 电台广播';
    }
}

function playUrl() {
    const url = document.getElementById('urlInput').value.trim();
    const title = document.getElementById('titleInput').value.trim() || '自定义音频';
    const zone = document.getElementById('zoneSelectModal').value;
    
    if (!url) {
        showNotification('请输入有效的 URL');
        return;
    }
    
    if (!zone) {
        showNotification('请选择目标扬声器');
        return;
    }
    
    closePlayUrlModal();
    playUrlWithTitle(url, title, zone);
}

function addRadioStation() {
    const title = document.getElementById('addTitleInput').value.trim();
    const url = document.getElementById('addUrlInput').value.trim();
    
    if (!title || !url) {
        showNotification('请填写所有字段');
        return;
    }
    
    const addBtn = document.querySelector('#addModal .modal-btn.primary');
    if (addBtn) {
        addBtn.disabled = true;
        addBtn.style.opacity = '0.7';
    }
    
    fetch('/api/radio_stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, url: url })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.style.opacity = '1';
        }
        
        if (d.success) {
            closeAddModal();
            showNotification('添加成功');
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            showNotification('添加失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(function(e) { 
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.style.opacity = '1';
        }
        showNotification('请求失败: ' + e); 
    });
}

function updateRadioStation() {
    const id = document.getElementById('editId').value;
    const title = document.getElementById('editTitleInput').value.trim();
    const url = document.getElementById('editUrlInput').value.trim();
    
    if (!id || !title || !url) {
        showNotification('请填写所有字段');
        return;
    }
    
    const saveBtn = document.querySelector('#editModal .modal-btn.primary');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.7';
    }
    
    fetch('/api/radio_stations/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title, url: url })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
        }
        
        if (d.success) {
            closeEditModal();
            showNotification('更新成功');
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            showNotification('更新失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(function(e) { 
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.style.opacity = '1';
        }
        showNotification('请求失败: ' + e); 
    });
}

function deleteRadioStation(id) {
    if (!confirm('确定要删除这个电台吗？')) return;
    
    const listItems = document.querySelectorAll('.radio-list-item');
    let itemToRemove = null;
    
    listItems.forEach(function(item) {
        if (parseInt(item.dataset.id) === id) {
            itemToRemove = item;
        }
    });
    
    if (itemToRemove) {
        itemToRemove.style.transform = 'translateX(-20px)';
        itemToRemove.style.opacity = '0';
        itemToRemove.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
    
    fetch('/api/radio_stations/' + id, { method: 'DELETE' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.success) {
            showNotification('已删除');
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            if (itemToRemove) {
                itemToRemove.style.transform = '';
                itemToRemove.style.opacity = '';
            }
            showNotification('删除失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(function(e) { 
        if (itemToRemove) {
            itemToRemove.style.transform = '';
            itemToRemove.style.opacity = '';
        }
        showNotification('请求失败: ' + e); 
    });
}

function highlightRadioStation(stationId) {
    const items = document.querySelectorAll('.radio-list-item');
    items.forEach(function(item) {
        if (parseInt(item.dataset.id) === stationId) {
            item.style.borderColor = 'var(--accent)';
            item.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
            setTimeout(function() {
                item.style.borderColor = '';
                item.style.boxShadow = '';
            }, 1500);
        }
    });
}

function filterRadioStations(searchTerm) {
    const items = document.querySelectorAll('.radio-list-item');
    items.forEach(function(item) {
        const title = item.querySelector('.radio-title').textContent.toLowerCase();
        if (title.includes(searchTerm.toLowerCase())) {
            item.style.display = '';
            item.style.opacity = '1';
        } else {
            item.style.opacity = '0';
            item.style.transform = 'translateX(-20px)';
            setTimeout(function() {
                item.style.display = 'none';
            }, 300);
        }
    });
}