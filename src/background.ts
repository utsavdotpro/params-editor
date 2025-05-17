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
        console.error("UPDATE_URL error: URL is missing", message);
        sendResponse({ success: false, error: "URL is missing" });
        return true;
      }

      // Validate the URL before attempting to update
      if (!isValidUrl(message.url)) {
        console.error("UPDATE_URL error: Invalid URL format", message);
        sendResponse({ success: false, error: "Invalid URL format" });
        return true;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          console.error("UPDATE_URL error: No active tabs found", message);
          sendResponse({ success: false, error: "No active tabs found" });
          return;
        }

        if (tabs[0]?.id) {
          try {
            console.log("Updating tab URL to:", message.url);

            // Parse and validate the URL one more time to ensure it's properly formatted
            try {
              const parsedUrl = new URL(message.url);

              // Some sites are sensitive to how query parameters are formatted
              // Let's make a cleaner URL with proper encoding
              const cleanUrl = (() => {
                // Preserve the base URL (origin + pathname)
                const base = parsedUrl.origin + parsedUrl.pathname;

                // Extract the search params (without the leading '?')
                const searchStr = parsedUrl.search.startsWith("?")
                  ? parsedUrl.search.substring(1)
                  : parsedUrl.search;

                // If no search params, just return the base URL
                if (!searchStr) return base;

                // Create a new URLSearchParams and re-append properly
                const searchParams = new URLSearchParams(searchStr);
                return `${base}?${searchParams.toString()}${parsedUrl.hash}`;
              })();

              console.log("Re-formatted URL:", cleanUrl);

              // Use the cleaned URL for the update
              chrome.tabs.update(tabs[0].id, { url: cleanUrl }, (tab) => {
                const error = chrome.runtime.lastError;
                if (error) {
                  console.error("Error updating tab URL:", error, message);
                  let errorMessage = error.message || "Unknown error";

                  if (
                    errorMessage.includes("permission") ||
                    errorMessage.includes("access")
                  ) {
                    errorMessage = `Permission denied to navigate to this URL: ${errorMessage}`;
                  } else if (
                    errorMessage.includes("cannot") ||
                    errorMessage.includes("not allowed")
                  ) {
                    errorMessage = `This site (${parsedUrl.hostname}) restricts URL modifications: ${errorMessage}`;
                  }

                  sendResponse({ success: false, error: errorMessage });
                  return;
                }

                if (!tab) {
                  console.error("UPDATE_URL error: Tab update failed", message);
                  sendResponse({
                    success: false,
                    error:
                      "Tab update failed - the browser may be restricting navigation to this site",
                  });
                  return;
                }

                console.log("Tab URL successfully updated");
                sendResponse({ success: true });
              });
            } catch (urlError: unknown) {
              console.error("URL parsing error:", urlError, message);
              const errorMessage =
                urlError instanceof Error ? urlError.message : String(urlError);
              sendResponse({
                success: false,
                error: `Invalid URL format: ${errorMessage}`,
              });
            }
          } catch (error) {
            console.error("Exception while updating tab URL:", error, message);
            let errorMessage = String(error);

            if (
              errorMessage.includes("Cannot access") ||
              errorMessage.includes("permission")
            ) {
              errorMessage = `Extension doesn't have permission to modify URLs on this site: ${errorMessage}`;
            }

            sendResponse({ success: false, error: errorMessage });
          }
        } else {
          console.error(
            "UPDATE_URL error: Could not get current tab ID",
            message
          );
          sendResponse({
            success: false,
            error: "Could not get current tab ID",
          });
        }
      });
      return true;
    } catch (error) {
      console.error("Error handling UPDATE_URL message:", error, message);
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
