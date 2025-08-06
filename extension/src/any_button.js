(async () => {
  const { buttons = [] } = await chrome.storage.local.get("buttons");

  function getMatchingButtons(url) {
    return buttons.filter((button) => {
      try {
        return new RegExp(button.origin).test(url);
      } catch {
        return false;
      }
    });
  }

  function addButtons() {
    const url = location.href;
    const matching = getMatchingButtons(url);

    for (const button of matching) {
      if (document.getElementById(button.name)) continue;

      const container = document.querySelector(button.location);
      if (!container) {
        continue;
      }

      const btn = document.createElement("button");
      btn.id = button.name;
      btn.textContent = button.label;
      btn.style = button.style;

      btn.onclick = () => actionHandler(button);

      container.appendChild(btn);
    }
  }

  function actionHandler(button) {
    const variables = parseVariables(button.variables);
    const action = replaceVariables(button.action, variables);

    if (button.actionType === "url") {
      handleUrlAction(action);
    } else if (button.actionType === "js") {
      runScript(action);
    } else if (button.actionType === "shell") {
      runShellCommand(action);
    }
  }

  function parseVariables(variables) {
    const parsed = [];
    for (const variable of variables) {
      const value =
        document.querySelector(variable.value)?.textContent.trim() || "";
      parsed.push({ key: variable.key, value });
    }
    return parsed;
  }

  function replaceVariables(action, variables) {
    return variables.reduce((acc, variable) => {
      const regex = new RegExp(`\\{${variable.key}\\}`, "g");
      return acc.replace(regex, variable.value);
    }, action);
  }

  function handleUrlAction(url) {
    window.open(url, "_blank");
  }

  function runScript(js) {
    try {
      new Function(js)();
    } catch (error) {
      console.error(
        "Error executing script:",
        error,
        "Re-running in background script."
      );

      const domSnapshot = document.documentElement.outerHTML;

      chrome.runtime.sendMessage({
        type: "run-js",
        code: js,
        dom: domSnapshot,
      });
    }
  }

  function runShellCommand(script) {
    chrome.runtime.sendMessage({
      type: "run-shell",
      code: script,
    });
  }

  addButtons();

  const observer = new MutationObserver(addButtons);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
