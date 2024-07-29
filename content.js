console.log("content.js  aaa");
function clickButton(selector) {
    const button = document.querySelector(selector);
    if (button) {
      button.click();
    }
  }
  
  // Selectors for Netflix buttons
  const skipButtonSelector = '.watch-video--skip-content-button';
  const nextEpisodeButtonSelector = 'button[data-uia="next-episode-seamless-button"]';
  const continueWatchingButtonSelector = 'button[data-uia="interrupt-autoplay-continue"]';
  
  // Function to click buttons
  function clickNetflixButtons() {
    clickButton(skipButtonSelector);
    clickButton(nextEpisodeButtonSelector);
    clickButton(continueWatchingButtonSelector);
  }
  
  // Monitor for DOM changes to detect new buttons
  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      if (mutation.type === 'childList' || mutation.type === 'subtree') {
        clickNetflixButtons();
      }
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Initial click in case buttons are already present
  clickNetflixButtons();