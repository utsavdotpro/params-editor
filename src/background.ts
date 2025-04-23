/// <reference types="chrome"/>

chrome.runtime.onInstalled.addListener(() => {
  console.log("Params Editor extension installed");
});

// Consolidated message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background script:", message);

  if (message.type === "GET_CURRENT_URL") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        console.log("Sending URL to popup:", tabs[0].url);
        sendResponse({ url: tabs[0].url });
      } else {
        console.error("Could not get current tab URL");
        sendResponse({ url: null });
      }
    });
    return true; // Required for async response
  } else if (message.type === "UPDATE_URL") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        console.log("Updating tab URL to:", message.url);
        chrome.tabs.update(tabs[0].id, { url: message.url }, () => {
          console.log("Tab URL updated. Reloading tab.");
          // Reload the page after URL update
          // Adding a small delay to ensure the update completes
          setTimeout(() => {
            if (tabs[0]?.id) {
              chrome.tabs.reload(tabs[0].id);
            }
          }, 200);
        });
      } else {
        console.error("Could not get current tab ID for URL update");
      }
    });
    // No async response needed here
  } else if (message.type === "contentScriptLoaded") {
    console.log(
      "Content script loaded message received from tab:",
      sender.tab?.id
    );
    sendResponse({
      status: "Background script received content script message",
    });
  }

  // If the message type isn't handled above, we might want to log it
  // or handle other potential message types here.

  // Return true if you intend to send an asynchronous response,
  // otherwise, the message channel might close before your async operation completes.
  // Only return true for GET_CURRENT_URL in this case.
});
