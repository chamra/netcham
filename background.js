console.log("background listening started");

chrome.webNavigation.onCompleted.addListener(function(details) {
    if (details.url.includes('netflix.com')) {
      chrome.tabs.executeScript(details.tabId, {
        file: 'content.js'
      });
    }
  }, {url: [{urlMatches: 'https://www.netflix.com/*'}]});