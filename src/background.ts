/// <reference types="chrome"/>

chrome.runtime.onInstalled.addListener(() => {
  console.log("Params Editor extension installed");
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(
  (
    message: any,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    console.log("Message received in background script:", message);
    // Handle messages here
  }
);
