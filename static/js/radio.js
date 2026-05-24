let radioStationsData = [];

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
    fetch('/api/speaker/' + encodeURIComponent(targetZone) + '/play_url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url, title: title })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.exit_code === 0 || d.success) {
            showNotification('已播放: ' + title + ' → ' + targetZone);
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            showNotification('播放失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(function(e) { showNotification('请求失败: ' + e); });
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
        body: JSON.stringify({ title: title, url: url })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.success) {
            closeAddModal();
            showNotification('添加成功');
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            alert('添加失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(function(e) { alert('请求失败: ' + e); });
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
        body: JSON.stringify({ title: title, url: url })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.success) {
            closeEditModal();
            showNotification('更新成功');
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            alert('更新失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(function(e) { alert('请求失败: ' + e); });
}

function deleteRadioStation(id) {
    if (!confirm('确定要删除这个电台吗？')) return;
    fetch('/api/radio_stations/' + id, { method: 'DELETE' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.success) {
            showNotification('已删除');
            setTimeout(function() { refreshPagePartial(); }, 500);
        } else {
            alert('删除失败: ' + (d.error || '未知错误'));
        }
    })
    .catch(function(e) { alert('请求失败: ' + e); });
}
