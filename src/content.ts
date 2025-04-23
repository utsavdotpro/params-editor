/// <reference types="chrome"/>

console.log("Content script loaded");

// Example: Send a message to background script
chrome.runtime.sendMessage({ type: "contentScriptLoaded" }, (response) => {
  console.log("Response from background:", response);
});
