const ACTION_TOOLTIP = `
  Custom action to perform when the button is clicked.<br><br>
  Variables are available in the form of <code>${"{key}"}</code> where <code>key</code> is the variable name.<br><br>
  <strong>URL:</strong> Opens the specified URL string in a new tab.<br><br>
  <strong>JS:</strong> Executes the provided JavaScript code. If CSP is enabled, JS is run in sandbox with a static copy of the DOM.<br><br>
  <strong>Shell:</strong> Executes the provided shell command.<br><br>
`;

class Button {
  constructor({
    name = "",
    label = "",
    origin = "",
    location = "",
    style = "",
    actionType = "",
    action = "",
    variables = [],
  } = {}) {
    this.name = name;
    this.label = label;
    this.origin = origin;
    this.location = location;
    this.style = style;
    this.actionType = actionType;
    this.action = action;
    this.variables = Array.isArray(variables) ? variables : [];
  }

  static fromJSON(json = {}) {
    return new Button(json);
  }

  async addToStorage(replace = false) {
    let { buttons = [] } = await chrome.storage.local.get("buttons");
    let baseName = this.name;
    let name = baseName;
    let counter = 1;

    if (!replace) {
      while (buttons.some((btn) => btn.name === name)) {
        name = `${baseName}(${counter++})`;
      }
    } else {
      buttons = buttons.filter((btn) => btn.name !== baseName);
    }

    this.name = name;
    buttons.push(this);
    await chrome.storage.local.set({ buttons });
  }
}

let currentButtons = [];

initMain();
showButtons();

function initMain() {
  const main = document.createElement("main");
  main.id = "main";
  document.body.appendChild(main);
}

async function showButtons() {
  const main = document.getElementById("main");
  main.innerHTML = "";

  const buttonContainer = document.createElement("div");
  buttonContainer.id = "import-export-container";

  addCreateButtons(buttonContainer);
  addExternalDataButtons(buttonContainer);

  main.appendChild(buttonContainer);

  const listElement = document.createElement("ul");
  listElement.id = "button-list";

  currentButtons = (await chrome.storage.local.get("buttons"))?.buttons ?? [];
  currentButtons
    .map(createButtonListItem)
    .forEach(listElement.appendChild.bind(listElement));

  main.appendChild(listElement);
}

function addExternalDataButtons(container) {
  const importBtn = document.createElement("button");
  importBtn.id = "import-button";
  importBtn.textContent = "📂";
  importBtn.onclick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (Array.isArray(data)) {
          for (const b of data) await new Button(b).addToStorage(true);
          showButtons();
        } else {
          alert("Invalid JSON format");
        }
      } catch (err) {
        alert("Failed to parse JSON: " + err.message);
      }
    };
    input.click();
  };

  const exportBtn = document.createElement("button");
  exportBtn.id = "export-button";
  exportBtn.textContent = "💾";
  exportBtn.onclick = async () => {
    const { buttons } = await chrome.storage.local.get("buttons");
    const blob = new Blob([JSON.stringify(buttons || [], null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buttons-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  container.append(importBtn, exportBtn);
}

async function deleteButton(name) {
  const { buttons = [] } = await chrome.storage.local.get("buttons");
  const updatedButtons = buttons.filter((button) => button.name !== name);
  await chrome.storage.local.set({ buttons: updatedButtons });
  const listItem = document.getElementById(name);
  if (listItem) {
    listItem.remove();
  }
}

function createButtonListItem(button) {
  const listItem = document.createElement("li");
  listItem.id = button.name;

  const label = document.createElement("span");
  label.id = "button-label";
  label.textContent = button.name;

  listItem.appendChild(label);

  listItem.onclick = () => showForm(button);

  const removeButton = createRemoveButton(deleteButton.bind(null, button.name));
  listItem.appendChild(removeButton);

  return listItem;
}

function addCreateButtons(container) {
  const createButton = document.createElement("button");
  createButton.id = "create-button";
  createButton.textContent = "+";
  createButton.onclick = showForm;

  container.appendChild(createButton);
}

function createRemoveButton(handler) {
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "×";
  removeButton.id = "remove-row-button";
  removeButton.onclick = (ev) => {
    ev.stopPropagation();
    handler();
  };

  return removeButton;
}

function showForm(button = null) {
  const main = document.getElementById("main");
  main.innerHTML = "";

  const form = document.createElement("form");
  form.id = "create-button-form";

  function createInputContainer(
    labelText,
    inputId,
    placeholder,
    tooltip = null,
    multiline = false,
    required = true
  ) {
    const label = document.createElement("label");
    label.textContent = labelText;
    label.htmlFor = inputId;

    if (tooltip) {
      const tooltipIcon = document.createElement("span");
      tooltipIcon.className = "tooltip-icon";
      tooltipIcon.textContent = "🛈";

      const tooltipSpan = document.createElement("span");
      tooltipSpan.className = "tooltip";
      tooltipSpan.innerHTML = tooltip;
      tooltipIcon.appendChild(tooltipSpan);
      label.appendChild(tooltipIcon);
    }

    const input = document.createElement(multiline ? "textarea" : "input");
    input.id = inputId;
    input.classList.add("input-field");
    input.placeholder = placeholder;
    input.required = required;

    const container = document.createElement("div");
    container.appendChild(label);
    container.appendChild(input);

    return { container, input };
  }

  const { container: nameContainer, input: nameInput } = createInputContainer(
    "Name:",
    "button-name",
    "Identifier for the button"
  );
  const { container: labelContainer, input: labelInput } = createInputContainer(
    "Label:",
    "button-label",
    "Display label"
  );
  const { container: originContainer, input: originInput } =
    createInputContainer(
      "Origin (regex):",
      "button-origin",
      "When to show the button",
      false,
      false
    );
  const { container: locationContainer, input: locationInput } =
    createInputContainer(
      "Location (CSS selector):",
      "button-location",
      "Where to show the button"
    );
  const { container: styleContainer, input: styleInput } = createInputContainer(
    "Style (CSS):",
    "button-style",
    "Style for the button",
    false,
    false
  );

  const variablesContainer = document.createElement("div");
  variablesContainer.id = "variables-container";

  const variablesLabel = document.createElement("label");
  variablesLabel.textContent = "Variables:";

  function addVariableRow(key = "", value = "") {
    const row = document.createElement("tr");

    const keyCell = document.createElement("td");
    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.placeholder = "key";
    keyInput.required = true;
    keyInput.value = key;
    keyCell.appendChild(keyInput);

    const valueCell = document.createElement("td");
    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.placeholder = "CSS Selector";
    valueInput.required = true;
    valueInput.value = value;
    valueCell.appendChild(valueInput);

    const removeCell = document.createElement("td");
    const removeButton = createRemoveButton(row.remove.bind(row));
    removeCell.appendChild(removeButton);

    row.appendChild(keyCell);
    row.appendChild(valueCell);
    row.appendChild(removeCell);
    table.appendChild(row);
  }

  const addRowButton = document.createElement("button");
  addRowButton.type = "button";
  addRowButton.textContent = "+";
  addRowButton.id = "add-row-button";
  addRowButton.onclick = () => addVariableRow();

  const variablesLabelContainer = document.createElement("div");
  variablesLabelContainer.id = "variables-label-container";
  variablesLabelContainer.appendChild(variablesLabel);
  variablesLabelContainer.appendChild(addRowButton);

  const table = document.createElement("table");
  table.id = "variables-table";

  variablesContainer.appendChild(variablesLabelContainer);
  variablesContainer.appendChild(table);

  const { container: actionContainer, input: actionInput } =
    createInputContainer(
      "Action:",
      "button-action",
      "example.com/{path}",
      ACTION_TOOLTIP,
      true
    );

  const actionTypeLabel = document.createElement("label");
  actionTypeLabel.textContent = "Type:";

  const actionTypeContainer = document.createElement("div");
  actionTypeContainer.id = "action-type-container";
  actionTypeContainer.appendChild(actionTypeLabel);

  function updateActionPlaceholder() {
    const selected = document.querySelector(
      'input[name="action-type"]:checked'
    )?.value;
    switch (selected) {
      case "url":
        actionInput.placeholder = "example.com/{path}";
        break;
      case "js":
        actionInput.placeholder = "console.log({msg});";
        break;
      case "shell":
        actionInput.placeholder = "echo {msg}";
        break;
    }
  }

  const actionTypes = [
    { value: "url", label: "URL", selected: true },
    { value: "js", label: "JS" },
    { value: "shell", label: "Shell" },
  ];

  actionTypes.forEach(({ value, label, selected }) => {
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "action-type";
    radio.value = value;
    radio.id = `action-type-${value}`;
    if (selected) radio.checked = true;
    radio.required = true;

    radio.addEventListener("change", updateActionPlaceholder);

    const radioLabel = document.createElement("label");
    radioLabel.htmlFor = radio.id;
    radioLabel.textContent = label;

    actionTypeContainer.appendChild(radio);
    actionTypeContainer.appendChild(radioLabel);
  });

  updateActionPlaceholder();

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  cancelButton.id = "cancel-button";
  cancelButton.onclick = showButtons;

  const addButton = document.createElement("button");
  addButton.type = "submit";
  addButton.textContent = "Save";
  addButton.id = "add-button";

  const buttons = document.createElement("div");
  buttons.id = "form-buttons";
  buttons.appendChild(cancelButton);
  buttons.appendChild(addButton);

  form.onsubmit = async (event) => {
    event.preventDefault();

    const buttonName = nameInput.value.trim();
    if (!buttonName) return;

    const rows = table.querySelectorAll("tr");
    const variables = [];
    rows.forEach((row) => {
      const key = row.children[0].querySelector("input").value.trim();
      const value = row.children[1].querySelector("input").value.trim();
      if (key && value) {
        variables.push({ key, value });
      }
    });

    const button = new Button({
      name: buttonName,
      label: labelInput.value.trim(),
      origin: originInput.value.trim(),
      location: locationInput.value.trim(),
      style: styleInput.value.trim(),
      actionType: document.querySelector('input[name="action-type"]:checked')
        .value,
      action: actionInput.value.trim(),
      variables,
    });

    await button.addToStorage(button !== null);

    if (button === null) {
      const newButtonItem = createButtonListItem(button);
      document.getElementById("button-list").appendChild(newButtonItem);
    } else {
      const buttonIndex = currentButtons.findIndex(
        (btn) => btn.name === buttonName
      );
      if (buttonIndex !== -1) {
        currentButtons[buttonIndex] = button;
      }
    }

    showButtons();
  };

  form.appendChild(nameContainer);
  form.appendChild(labelContainer);
  form.appendChild(originContainer);
  form.appendChild(locationContainer);
  form.appendChild(styleContainer);
  form.appendChild(actionTypeContainer);
  form.appendChild(variablesContainer);
  form.appendChild(actionContainer);
  form.appendChild(buttons);

  document.getElementById("main").appendChild(form);

  if (button) {
    nameInput.value = button.name || "";
    labelInput.value = button.label || "";
    originInput.value = button.origin || "";
    locationInput.value = button.location || "";
    styleInput.value = button.style || "";
    actionInput.value = button.action || "";
    const actionTypeRadio = form.querySelector(
      `input[name="action-type"][value="${button.actionType}"]`
    );
    if (actionTypeRadio) actionTypeRadio.checked = true;
    table.innerHTML = "";
    if (Array.isArray(button.variables)) {
      button.variables.forEach((v) => addVariableRow(v.key, v.value));
    }
  }
}
