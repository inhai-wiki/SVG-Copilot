let lastClipboardContent = '';

function initializeClipboardCheck() {
    console.log("Initializing clipboard check");
    document.removeEventListener('copy', handleCopyEvent);
    document.removeEventListener('click', handleClickEvent);
    document.addEventListener('copy', handleCopyEvent);
    document.addEventListener('click', handleClickEvent);
    setupMutationObserver();
}

function handleCopyEvent(event) {
    console.log("Copy event triggered");
    setTimeout(checkClipboard, 100);
}

function handleClickEvent(event) {
    if (event.target.matches('.copy-button, button[aria-label="Copy code"]')) {
        console.log("Copy button clicked");
        setTimeout(checkClipboard, 100);
    }
}

function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const buttons = node.querySelectorAll('.copy-button, button[aria-label="Copy code"]');
                        buttons.forEach(button => button.addEventListener('click', handleClickEvent));
                    }
                });
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function checkClipboard() {
    navigator.clipboard.readText().then(text => {
        if (text !== lastClipboardContent) {
            console.log("Clipboard content changed");
            lastClipboardContent = text;
            handleSVGContent(text);
        }
    }).catch(err => {
        console.log("Error reading clipboard:", err);
    });
}

function handleSVGContent(content) {
    const svgContent = extractSVGContent(content);
    if (svgContent) {
        sendMessageToBackground({ 
            type: 'copy-event', 
            svgContent: svgContent 
        });
    } else {
        console.log("No SVG content found");
    }
}

function extractSVGContent(text) {
    const svgRegex = /<svg[\s\S]*?<\/svg>/;
    const match = text.match(svgRegex);
    return match ? match[0] : null;
}

function sendMessageToBackground(message) {
    chrome.runtime.sendMessage(message).catch(error => {
        console.log("Error sending message to background:", error.message);
    });
}

// 初始化
initializeClipboardCheck();

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "tab-activated" || message.type === "tab-updated") {
        console.log("Reinitializing clipboard check");
        initializeClipboardCheck();
    }
});