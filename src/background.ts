/// <reference types="chrome"/>

chrome.runtime.onInstalled.addListener(() => {
  console.log("Params Editor extension installed");
});

// Utility function to validate URLs
function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch (error) {
    return false;
  }
}

// Consolidated message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_CURRENT_URL") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        sendResponse({ url: tabs[0].url });
      } else {
        console.error("Could not get current tab URL");
        sendResponse({ url: null });
      }
    });
    return true; // Required for async response
  } else if (message.type === "UPDATE_URL") {
    try {
      if (!message.url) {
        sendResponse({ success: false, error: "URL is missing" });
        return true;
      }

      // Validate the URL before attempting to update
      if (!isValidUrl(message.url)) {
        sendResponse({ success: false, error: "Invalid URL format" });
        return true;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          sendResponse({ success: false, error: "No active tabs found" });
          return;
        }

        if (tabs[0]?.id) {
          try {
            chrome.tabs.update(tabs[0].id, { url: message.url }, (tab) => {
              const error = chrome.runtime.lastError;
              if (error) {
                console.error("Error updating tab URL:", error);
                sendResponse({ success: false, error: error.message });
                return;
              }

              if (!tab) {
                sendResponse({ success: false, error: "Tab update failed" });
                return;
              }

              // Reload the page after URL update
              // Adding a small delay to ensure the update completes
              setTimeout(() => {
                if (tabs[0]?.id) {
                  chrome.tabs.reload(tabs[0].id);
                }
              }, 500); // Increased delay for better reliability

              sendResponse({ success: true });
            });
          } catch (error) {
            console.error("Exception while updating tab URL:", error);
            sendResponse({ success: false, error: String(error) });
          }
        } else {
          sendResponse({
            success: false,
            error: "Could not get current tab ID",
          });
        }
      });
      return true; // Indicate we'll send response asynchronously
    } catch (error) {
      console.error("Error handling UPDATE_URL message:", error);
      sendResponse({ success: false, error: String(error) });
      return true;
    }
  } else if (message.type === "contentScriptLoaded") {
    sendResponse({
      status: "Background script received content script message",
    });
  } else {
    sendResponse({ success: false, error: "Unhandled message type" });
  }

  // Return true to support async responses for all message types
  return true;
});
