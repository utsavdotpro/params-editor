/// <reference types="chrome"/>

document.addEventListener("DOMContentLoaded", () => {
  const editParamsButton = document.getElementById("editParams");

  if (editParamsButton) {
    editParamsButton.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "editParams" });
        }
      });
    });
  }
});
