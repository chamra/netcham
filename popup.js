
console.log("popup js");

const defaultKeyBindings = {
    nextEpisode: 'n',
    rewind: ',',
    fastForward: '.',
    ffSeconds: 5,
    rwSeconds: 5
};

const inputAndElement = {
    nextEpisode: 'key-next',
    rewind: 'key-rewind',
    fastForward: 'key-forward',
    ffSeconds: 'fast-forward-seconds',
    rwSeconds: 'rewind-seconds'
};


document.getElementById('save-bindings').addEventListener('click', () => {

    const keyNextInput = document.getElementById('key-next').value.trim().toLowerCase();
    const keyRewindInput = document.getElementById('key-rewind').value.trim().toLowerCase();
    const keyForwardInput = document.getElementById('key-forward').value.trim().toLowerCase();
    const rewindInput = document.getElementById('rewind-seconds').value.trim().toLowerCase();
    const fastForwardInput = document.getElementById('key-forward').value.trim().toLowerCase();

    const newKeyBindings = {
        nextEpisode: keyNextInput || defaultKeyBindings.nextEpisode,
        rewind: keyRewindInput || defaultKeyBindings.rewind,
        fastForward: keyForwardInput || defaultKeyBindings.fastForward,
        ffSeconds: parseInt(fastForwardInput, 10) || defaultKeyBindings.ffSeconds,
        rwSeconds: parseInt(rewindInput, 10) || defaultKeyBindings.rwSeconds
    }

    for (const key of Object.keys(newKeyBindings)) {
        storageSet({ [key]: newKeyBindings[key] })
    }

})

let keyBindings = { ...defaultKeyBindings };

const extApi = (typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : undefined));

function storageGet(keys, callback) {
    if (!extApi) {
        callback({});
        return;
    }
    if (typeof browser !== 'undefined' && extApi.storage?.local?.get) {
        extApi.storage.local.get(keys).then(callback).catch((error) => {
            console.error('storage.get failed', error);
            callback({});
        });
    } else {
        extApi.storage.local.get(keys, callback);
    }
}

function storageSet(items, callback) {
    if (!extApi) {
        callback && callback();
        return;
    }
    if (typeof browser !== 'undefined' && extApi.storage?.local?.set) {
        extApi.storage.local.set(items).then(() => callback && callback()).catch((error) => {
            console.error('storage.set failed', error);
            callback && callback();
        });
    } else {
        extApi.storage.local.set(items, callback);
    }
}


for (const key of Object.keys(inputAndElement)) {
    const inputId = inputAndElement[key];
    const inputElement = document.getElementById(inputId);
    if (inputElement) {
        storageGet(key, (result) => {
            if (result && result[key] !== undefined) {
                inputElement.value = result[key];
            } else {
                inputElement.value = defaultKeyBindings[key];
            }
        });
    }
}



function tabsQuery(queryInfo, callback) {
    if (window.browser && extApi.tabs?.query) {
        extApi.tabs.query(queryInfo).then(callback).catch((error) => {
            console.error('tabs.query failed', error);
            callback([]);
        });
    } else {
        extApi.tabs.query(queryInfo, callback);
    }
}

function sendMessage(tabId, message, callback) {
    if (window.browser && extApi.tabs?.sendMessage) {
        extApi.tabs.sendMessage(tabId, message).then((response) => {
            if (callback) callback(response);
        }).catch((error) => {
            console.error('tabs.sendMessage failed', error);
            if (callback) callback();
        });
    } else {
        extApi.tabs.sendMessage(tabId, message, callback);
    }
}

function formatTime(seconds) {
    if (seconds == null || isNaN(seconds)) {
        return '--:--';
    }
    const rounded = Math.floor(seconds);
    const minutes = Math.floor(rounded / 60);
    const secs = rounded % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getActiveTab(callback) {
    tabsQuery({ active: true, currentWindow: true }, (tabs) => callback(tabs[0]));
}

function sendAction(action, payload = {}) {
    getActiveTab((tab) => {
        if (!tab?.id) {
            return;
        }
        sendMessage(tab.id, { type: 'action', action, payload });
    });
}

function updateElapsedStatus() {
    getActiveTab((tab) => {
        if (!tab?.id) {
            return;
        }
        sendMessage(tab.id, { type: 'getElapsedTime' }, (response) => {
            const elapsedTime = document.getElementById('elapsed-time');
            const durationTime = document.getElementById('duration-time');
            const playbackStatus = document.getElementById('playback-status');

            if ((window.chrome && chrome.runtime?.lastError) || !response) {
                elapsedTime.textContent = '--:--';
                durationTime.textContent = '--:--';
                playbackStatus.textContent = 'not connected';
                return;
            }

            elapsedTime.textContent = formatTime(response.currentTime);
            durationTime.textContent = formatTime(response.duration);
            playbackStatus.textContent = response.paused ? 'paused' : 'playing';
        });
    });
}

function normalizeKey(value) {
    const key = (value || '').trim().toLowerCase();
    return key.length === 1 ? key : '';
}

function saveKeyBinding(action, value) {
    const normalized = normalizeKey(value);
    keyBindings[action] = normalized || defaultKeyBindings[action];
    storageSet({ keyBindings });
    refreshKeyInputs();
}

function refreshKeyInputs() {
    document.getElementById('key-next').value = keyBindings.nextEpisode;
    document.getElementById('key-subtitles').value = keyBindings.toggleEnglishSubtitles;
    document.getElementById('key-rewind').value = keyBindings.rewind;
    document.getElementById('key-forward').value = keyBindings.fastForward;
    // update visible preview
    const preview = document.getElementById('current-shortcuts');
    if (preview) {
        preview.textContent = `Saved: Next=${keyBindings.nextEpisode.toUpperCase()} · Sub=${keyBindings.toggleEnglishSubtitles.toUpperCase()} · Rew=${keyBindings.rewind} · Fwd=${keyBindings.fastForward}`;
    }
}

function loadKeyBindings(callback) {
    storageGet('keyBindings', (result) => {
        if (result && result.keyBindings) {
            keyBindings = { ...defaultKeyBindings, ...result.keyBindings };
        }
        if (callback) {
            callback();
        }
    });
}
