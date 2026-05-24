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
    
    body.style.opacity = '0.7';
    setTimeout(function() {
        body.style.opacity = '1';
    }, 150);
    
    if (themeIcon) {
        themeIcon.style.transform = 'rotate(180deg)';
        setTimeout(function() {
            themeIcon.textContent = isLight ? '☀' : '🌙';
            themeIcon.style.transform = 'rotate(0deg)';
        }, 150);
    }
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
    pollState();
}

var _transitionCheckRunning = false;

function checkTransitioningAndRefresh() {
    var cards = document.querySelectorAll('.speaker-card .speaker-state.state-transitioning');
    if (cards.length > 0) {
        if (_transitionCheckRunning) return;
        _transitionCheckRunning = true;
        setTimeout(function() {
            _transitionCheckRunning = false;
            pollState();
            checkTransitioningAndRefresh();
        }, 500);
    }
}

function animateCardHover(card) {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-6px) scale(1.01)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
}

function animateButtonPress(button) {
    button.addEventListener('mousedown', function() {
        this.style.transform = 'scale(0.95)';
    });
    
    button.addEventListener('mouseup', function() {
        this.style.transform = 'scale(1)';
    });
    
    button.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
    });
}

function animateRadioItem(item) {
    item.addEventListener('mouseenter', function() {
        var actions = this.querySelector('.radio-actions');
        if (actions) {
            Array.from(actions.children).forEach(function(btn, index) {
                setTimeout(function() {
                    btn.style.opacity = '1';
                    btn.style.transform = 'translateX(0)';
                }, index * 50);
            });
        }
    });
    
    item.addEventListener('mouseleave', function() {
        var actions = this.querySelector('.radio-actions');
        if (actions) {
            Array.from(actions.children).forEach(function(btn) {
                btn.style.opacity = '';
                btn.style.transform = '';
            });
        }
    });
}

function setupAnimations() {
    document.querySelectorAll('.speaker-card').forEach(animateCardHover);
    
    document.querySelectorAll('.quick-action-btn, .play-radio-btn, .modal-btn, .refresh-btn').forEach(animateButtonPress);
    
    document.querySelectorAll('.radio-list-item').forEach(animateRadioItem);
    
    document.querySelectorAll('.player-control-btn').forEach(function(btn) {
        animateButtonPress(btn);
        
        btn.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.boxShadow = '';
        });
    });
    
    document.querySelectorAll('.sleep-preset-btn, .sleep-cancel-btn').forEach(animateButtonPress);
    
    document.querySelectorAll('.player-volume-btn').forEach(animateButtonPress);
    
    document.querySelectorAll('.radio-action-btn').forEach(animateButtonPress);
}

function addModalTransition(modalId) {
    var overlay = document.getElementById(modalId);
    if (!overlay) return;
    
    var modal = overlay.querySelector('.modal');
    
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeModal(modalId);
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeModal(modalId);
        }
    });
}

function closeModal(modalId) {
    var overlay = document.getElementById(modalId);
    if (!overlay) return;
    
    var modal = overlay.querySelector('.modal');
    modal.style.transform = 'translateY(20px) scale(0.95)';
    modal.style.opacity = '0';
    
    setTimeout(function() {
        overlay.classList.remove('active');
        modal.style.transform = '';
        modal.style.opacity = '';
    }, 300);
}

function openModal(modalId) {
    var overlay = document.getElementById(modalId);
    if (!overlay) return;
    
    overlay.classList.add('active');
}

function enhanceVolumeSlider() {
    var slider = document.getElementById('mainVolume');
    if (!slider) return;
    
    slider.addEventListener('input', function() {
        var value = this.value;
        this.style.setProperty('--volume-percent', value + '%');
    });
    
    slider.dispatchEvent(new Event('input'));
}

function animateTrackSwitch(titleEl, artistEl, newTitle, newArtist) {
    if (titleEl) {
        titleEl.classList.add('switching');
        setTimeout(function() {
            titleEl.textContent = newTitle;
            titleEl.classList.remove('switching');
        }, 200);
    }
    
    if (artistEl) {
        artistEl.classList.add('switching');
        setTimeout(function() {
            artistEl.textContent = newArtist;
            artistEl.classList.remove('switching');
        }, 200);
    }
}

function enhanceNotification() {
    var originalShowNotification = showNotification;
    
    window.showNotification = function(msg) {
        var n = document.createElement('div');
        n.textContent = msg;
        n.style.cssText = `
            position: fixed;
            bottom: 160px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: var(--modal-bg);
            color: var(--text-primary);
            padding: 14px 28px;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: 500;
            z-index: 3000;
            border: 1px solid var(--border-color);
            box-shadow: var(--shadow-md);
            opacity: 0;
            transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        document.body.appendChild(n);
        
        requestAnimationFrame(function() {
            n.style.opacity = '1';
            n.style.transform = 'translateX(-50%) translateY(0)';
        });
        
        setTimeout(function() {
            n.style.opacity = '0';
            n.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(function() {
                if (n.parentNode) {
                    n.parentNode.removeChild(n);
                }
            }, 350);
        }, 2500);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    
    enhanceNotification();
    
    var jsonScript = document.getElementById('radioStationsJson');
    if (jsonScript) {
        try { 
            radioStationsData = JSON.parse(jsonScript.textContent); 
        } catch(e) {}
    }
    
    var zoneSelect = document.getElementById('zoneSelect');
    if (zoneSelect && zoneSelect.options.length === 2) {
        zoneSelect.value = zoneSelect.options[1].value;
        currentZone = zoneSelect.value;
        onZoneChange();
    }
    
    checkTransitioningAndRefresh();
    startAutoRefresh();
    
    setupAnimations();
    
    enhanceVolumeSlider();
    
    addModalTransition('playUrlModal');
    addModalTransition('addModal');
    addModalTransition('editModal');
    
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
    
    document.querySelectorAll('select').forEach(function(select) {
        select.addEventListener('change', function() {
            this.style.borderColor = 'var(--accent)';
            setTimeout(function() {
                select.style.borderColor = '';
            }, 300);
        });
    });
    
    document.querySelectorAll('input').forEach(function(input) {
        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'scale(1.02)';
        });
        
        input.addEventListener('blur', function() {
            this.parentElement.style.transform = '';
        });
    });
    
    // 设置移动端增强功能
    setupMobileEnhancements();
});

window.openAddModal = function() {
    openModal('addModal');
};

window.closeAddModal = function() {
    closeModal('addModal');
};

window.openPlayUrlModal = function() {
    openModal('playUrlModal');
};

window.closePlayUrlModal = function() {
    closeModal('playUrlModal');
};

window.openEditModal = function(id, title, url) {
    document.getElementById('editId').value = id;
    document.getElementById('editTitleInput').value = title;
    document.getElementById('editUrlInput').value = url;
    openModal('editModal');
};

window.closeEditModal = function() {
    closeModal('editModal');
};

// 移动端增强功能
function setupMobileEnhancements() {
    // 检测是否为移动设备
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    
    if (!isMobile) return;
    
    // 为广播库添加触摸滚动优化
    var radioList = document.getElementById('radioList');
    if (radioList) {
        // 添加触摸滚动时的视觉反馈
        var lastScrollTop = 0;
        radioList.addEventListener('scroll', function() {
            var scrollTop = this.scrollTop;
            var radioSection = this.closest('.radio-section');
            
            if (radioSection) {
                if (scrollTop > lastScrollTop && scrollTop > 10) {
                    // 向下滚动时添加阴影效果
                    radioSection.style.boxShadow = 'inset 0 -20px 20px -20px rgba(0, 212, 255, 0.15)';
                } else if (scrollTop < lastScrollTop && scrollTop > 10) {
                    // 向上滚动时添加顶部阴影
                    radioSection.style.boxShadow = 'inset 0 20px 20px -20px rgba(0, 212, 255, 0.15)';
                } else {
                    radioSection.style.boxShadow = '';
                }
            }
            lastScrollTop = scrollTop;
        });
    }
    
    // 为移动端优化通知位置
    var mobileNotification = function(msg) {
        var n = document.createElement('div');
        n.textContent = msg;
        n.style.cssText = 'position:fixed;bottom:260px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--modal-bg);color:var(--text-primary);padding:14px 24px;border-radius:12px;font-size:0.88rem;font-weight:500;z-index:3000;border:1px solid var(--border-color);box-shadow:var(--shadow-md);opacity:0;transition:all 0.35s cubic-bezier(0.4,0,0.2,1);max-width:90%;text-align:center;';
        document.body.appendChild(n);
        
        requestAnimationFrame(function() {
            n.style.opacity = '1';
            n.style.transform = 'translateX(-50%) translateY(0)';
        });
        
        setTimeout(function() {
            n.style.opacity = '0';
            n.style.transform = 'translateX(-50%) translateY(-10px)';
            setTimeout(function() {
                if (n.parentNode) {
                    n.parentNode.removeChild(n);
                }
            }, 350);
        }, 2000);
    };
    
    // 替换通知函数为移动端优化版本
    window.showNotification = mobileNotification;
    
    // 触摸反馈增强
    var interactiveElements = document.querySelectorAll('.player-control-btn, .radio-action-btn, .sleep-preset-btn, .quick-action-btn');
    interactiveElements.forEach(function(el) {
        el.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.9)';
            this.style.transition = 'transform 0.1s ease';
        });
        
        el.addEventListener('touchend', function() {
            this.style.transform = 'scale(1)';
        });
        
        el.addEventListener('touchcancel', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // 为广播项目添加触摸直接播放功能
    document.querySelectorAll('.radio-list-item').forEach(function(item, index) {
        item.setAttribute('data-index', index);
        
        item.addEventListener('touchstart', function(e) {
            this.style.background = 'var(--bg-card-hover)';
        });
        
        item.addEventListener('touchend', function() {
            this.style.background = '';
        });
    });
    
    // 滚动到当前选择的电台
    function scrollToSelectedStation() {
        var radioSelect = document.getElementById('radioSelect');
        if (radioSelect && radioSelect.value) {
            var stationId = parseInt(radioSelect.value);
            var selectedItem = document.querySelector('.radio-list-item[data-id="' + stationId + '"]');
            
            if (selectedItem) {
                selectedItem.style.borderColor = 'var(--accent)';
                selectedItem.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.25)';
                
                setTimeout(function() {
                    selectedItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }
    }
    
    // 在页面加载后尝试滚动到选择的电台
    setTimeout(scrollToSelectedStation, 500);
}