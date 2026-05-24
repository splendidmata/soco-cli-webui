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
