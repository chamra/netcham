console.log("content.js started");

const defaultKeyBindings = {
  nextEpisode: 'n',
  rewind: ',',
  fastForward: '.',
  ffSeconds: 5,
  rwSeconds: 5
};

const rewindSecondsDefault = 5;
const fastForwardSecondsDefault = 5;
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

function injectPageContextBridge() {
  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.textContent = `
    (function() {
      function getNetflixPlayer() {
        try {
          const videoPlayer = window.netflix?.appContext?.state?.playerApp?.getAPI()?.videoPlayer;
          if (!videoPlayer) return null;
          const sessionIds = videoPlayer.getAllPlayerSessionIds();
          if (!sessionIds || !sessionIds.length) return null;
          return videoPlayer.getVideoPlayerBySessionId(sessionIds[0]);
        } catch (error) {
          return null;
        }
      }

      function seekRelative(seconds) {
        const player = getNetflixPlayer();
        if (!player) {
          return;
        }
        const currentTime = player.getCurrentTime();
        const targetTime = Math.max(0, currentTime + seconds * 1000);
        player.seek(targetTime);
      }

      window.addEventListener('message', function(event) {
        if (event.source !== window || !event.data || event.data.type !== 'netcham-seek') {
          return;
        }
        const seconds = Number(event.data.seconds);
        if (!Number.isFinite(seconds)) {
          return;
        }
        seekRelative(seconds);
      });
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

function getVideo() {
  return document.querySelector('video');
}

function clickButton(selector) {
  const button = document.querySelector(selector);
  if (button) {
    button.click();
    return true;
  }
  return false;
}

function clickOnNextEpisode() {
  const buttons = document.querySelectorAll('button');
  const nextEpisodeButton = Array.from(buttons).find((button) => {
    const label = (button.getAttribute('aria-label') || button.textContent || '').toLowerCase();
    return label.includes('next episode') || label.includes('play next') || label.includes('play next episode');
  });

  if (nextEpisodeButton) {
    nextEpisodeButton.click();
    return true;
  }
  return false;
}

function clickNetflixButtons() {
  clickButton('.watch-video--skip-content-button');
  clickButton('button[data-uia="interrupt-autoplay-continue"]');
}

function dispatchSeekToPageContext(seconds) {
  window.postMessage({ type: 'netcham-seek', seconds }, '*');
}

function seekRelative(seconds) {
  dispatchSeekToPageContext(seconds);
}

function toggleEnglishSubtitles() {
  const video = getVideo();
  if (video && video.textTracks && video.textTracks.length > 0) {
    const englishTrack = Array.from(video.textTracks).find(track => /english/i.test(track.language || track.label || track.kind));
    if (englishTrack) {
      const anyShowing = Array.from(video.textTracks).some(track => track.mode === 'showing');
      englishTrack.mode = anyShowing ? 'disabled' : 'showing';
      return;
    }
  }

  const subtitleButtons = Array.from(document.querySelectorAll('button'))
    .filter(button => /audio|subtitles|cc/i.test(button.getAttribute('aria-label') || button.textContent));
  if (subtitleButtons.length > 0) {
    subtitleButtons[0].click();
  }
}

function getVideoElapsed() {
  const video = getVideo();
  if (!video) {
    return null;
  }
  return {
    currentTime: video.currentTime,
    duration: video.duration,
    paused: video.paused
  };
}

function handleMessage(message, sender, sendResponse) {
  if (!message || typeof message !== 'object') {
    return;
  }

  if (message.type === 'getElapsedTime') {
    sendResponse(getVideoElapsed());
    return true;
  }

  if (message.type === 'action') {
    switch (message.action) {
      case 'nextEpisode':
        clickOnNextEpisode();
        break;
      case 'toggleEnglishSubtitles':
        toggleEnglishSubtitles();
        break;
      case 'seek':
        if (message.payload && typeof message.payload.delta === 'number') {
          seekRelative(message.payload.delta);
        }
        break;
      default:
        break;
    }
  }
}

function normalizeKey(value) {
  const key = (value || '').trim().toLowerCase();
  return key.length === 1 ? key : '';
}

function refreshKeyBindings(bindings) {
  keyBindings = { ...defaultKeyBindings, ...bindings };
}

function loadKeyBindings() {
  const savedData = {};
  const keys = Object.keys(defaultKeyBindings);
  let remaining = keys.length;

  keys.forEach((key) => {
    storageGet(key, (result) => {
      if (result && typeof result === 'object' && key in result) {
        savedData[key] = result[key];
      }
      remaining -= 1;
      if (remaining === 0) {
        const filtered = Object.fromEntries(
          Object.entries(savedData).filter(([, value]) => value != null && value !== '')
        );
        if (Object.keys(filtered).length > 0) {
          refreshKeyBindings(filtered);
        }
        console.log('Loaded key bindings:', savedData);
      }
    });
  });
}

extApi.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.keyBindings) {
    refreshKeyBindings(changes.keyBindings.newValue);
  }
});

function onPageKeyDown(event) {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  const target = event.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
    return;
  }

  const key = event.key.toLowerCase();
  switch (key) {
    case keyBindings.nextEpisode:
      clickOnNextEpisode();
      break;
    case keyBindings.toggleEnglishSubtitles:
      toggleEnglishSubtitles();
      break;
    case keyBindings.rewind:
      seekRelative(-rewindSecondsDefault);
      break;
    case keyBindings.fastForward:
      seekRelative(fastForwardSecondsDefault);
      break;
    default:
      return;
  }
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' || mutation.type === 'subtree') {
      clickNetflixButtons();
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

injectPageContextBridge();
document.addEventListener('keydown', onPageKeyDown, true);
chrome.runtime.onMessage.addListener(handleMessage);
loadKeyBindings();
clickNetflixButtons();