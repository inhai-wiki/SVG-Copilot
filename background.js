let activeTabId = null;

chrome.tabs.onActivated.addListener(function(activeInfo) {
  activeTabId = activeInfo.tabId;
  console.log("Tab activated:", activeTabId);
  sendMessageToTab(activeTabId, {type: "tab-activated"});
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tabId === activeTabId) {
    console.log("Tab updated:", tabId);
    sendMessageToTab(tabId, {type: "tab-updated"});
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received message:", request);
  if (request.type === "copy-event" && request.svgContent) {
    console.log("Sending message to side panel");
    sendMessageToSidePanel({
      type: "fill-svg-input",
      svg: request.svgContent
    });
    sendResponse({ status: "success" });
  }
  return true;
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

function sendMessageToTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message).catch(error => {
    console.log(`Error sending message to tab ${tabId}:`, error.message);
  });
}

function sendMessageToSidePanel(message) {
  chrome.runtime.sendMessage(message).catch(error => {
    console.log("Error sending message to side panel:", error.message);
  });
}