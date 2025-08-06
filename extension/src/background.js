chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.type === "run-js") {
    try {
      const { document } = JSON.parse(message.dom);
      const userFunction = new Function("document", message.code);
      await userFunction(document);
      chrome.tabs.sendMessage(sender.tab.id, { type: "script-executed" });
    } catch (error) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "script-error",
        error: error.message || error.toString(),
      });
    }
  }

  if (message.type === "run-shell") {
    const port = chrome.runtime.connectNative("com.any_button_runner");
    port.onMessage.addListener((response) => {
      console.log("Received from native app:", response);
    });
    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError) {
        console.log("Native host error:", chrome.runtime.lastError.message);
      }
    });

    port.postMessage(message.code);
  }
});
