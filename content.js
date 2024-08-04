console.log("content.js started");

function clickButton(selector) {
  const button = document.querySelector(selector);
  if (button) {
    button.click();
  }
}

function clickOnNextEpisode() {
  const buttons = document.querySelectorAll('button');

  const nextEpisodeButton = Array.from(buttons).find(button => button.textContent.includes("Next Episode"));

  if (nextEpisodeButton) {
    nextEpisodeButton.click();
  }
}

// Selectors for Netflix buttons
const skipButtonSelector = '.watch-video--skip-content-button';
const continueWatchingButtonSelector = 'button[data-uia="interrupt-autoplay-continue"]';

// Function to click buttons
function clickNetflixButtons() {
  clickButton(skipButtonSelector);
  clickButton(continueWatchingButtonSelector);
  clickOnNextEpisode()

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