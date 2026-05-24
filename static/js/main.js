function initTheme() {
    var savedTheme = localStorage.getItem('theme');
    var themeIcon = document.querySelector('.theme-icon');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeIcon) themeIcon.textContent = '☀';
    } else {
        if (themeIcon) themeIcon.textContent = '🌙';
    }
}

function toggleTheme() {
    var body = document.body;
    var themeIcon = document.querySelector('.theme-icon');
    var isLight = body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    if (themeIcon) themeIcon.textContent = isLight ? '☀' : '🌙';
}

function onZoneChange() {
    var zoneSelect = document.getElementById('zoneSelect');
    if (zoneSelect) {
        currentZone = zoneSelect.value;
        if (currentZone) showNotification('已选择: ' + currentZone);
        var radioZone = document.getElementById('zoneSelectForRadio');
        if (radioZone) radioZone.value = currentZone || '';
        var modalZone = document.getElementById('zoneSelectModal');
        if (modalZone) modalZone.value = currentZone || '';
    }
}

function checkTransitioningAndRefresh() {
    var cards = document.querySelectorAll('.speaker-card .speaker-state.state-transitioning');
    if (cards.length > 0) {
        setTimeout(function() {
            pollState();
            checkTransitioningAndRefresh();
        }, 500);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    var jsonScript = document.getElementById('radioStationsJson');
    if (jsonScript) {
        try { radioStationsData = JSON.parse(jsonScript.textContent); } catch(e) {}
    }
    var zoneSelect = document.getElementById('zoneSelect');
    if (zoneSelect && zoneSelect.options.length === 2) {
        zoneSelect.value = zoneSelect.options[1].value;
        currentZone = zoneSelect.value;
        onZoneChange();
    }
    checkTransitioningAndRefresh();
    startAutoRefresh();
    document.getElementById('radioList').addEventListener('click', function(e) {
        var target = e.target.closest('.radio-action-btn');
        if (!target) return;
        var listItem = target.closest('.radio-list-item');
        var stationId = parseInt(listItem.dataset.id);
        if (target.classList.contains('edit')) {
            openEditModal(stationId, target.dataset.title, target.dataset.url);
        } else if (target.classList.contains('delete')) {
            deleteRadioStation(stationId);
        }
    });
});
