/// <reference types="chrome"/>

interface Param {
  key: string;
  value: string;
  type: "string" | "number" | "date" | "boolean";
}

class ParamsEditor {
  private originalUrl: string = "";
  private currentParams: Param[] = [];
  private originalParams: Param[] = [];

  constructor() {
    this.initializeElements();
    this.loadCurrentUrl();
    this.setupEventListeners();
  }

  private initializeElements() {
    // Elements will be initialized when needed
  }

  private async loadCurrentUrl() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.url) {
      this.originalUrl = tab.url;
      this.updateUrlDisplay();
      this.parseAndDisplayParams();
    }
  }

  private updateUrlDisplay() {
    const urlDisplay = document.getElementById("urlDisplay");
    if (urlDisplay) {
      urlDisplay.textContent = this.originalUrl;
    }
  }

  private parseAndDisplayParams() {
    const url = new URL(this.originalUrl);
    this.currentParams = [];
    this.originalParams = [];

    url.searchParams.forEach((value, key) => {
      const param: Param = {
        key,
        value,
        type: this.detectParamType(value),
      };
      this.currentParams.push(param);
      this.originalParams.push({ ...param });
    });

    this.renderParams();
  }

  private detectParamType(value: string): Param["type"] {
    if (value.toLowerCase() === "true" || value.toLowerCase() === "false") {
      return "boolean";
    }
    if (!isNaN(Number(value)) && value.trim() !== "") {
      return "number";
    }
    if (this.isValidDate(value)) {
      return "date";
    }
    return "string";
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private renderParams() {
    const paramsBody = document.getElementById("paramsBody");
    if (!paramsBody) return;

    paramsBody.innerHTML = "";
    this.currentParams.forEach((param, index) => {
      const row = document.createElement("tr");

      // Key cell
      const keyCell = document.createElement("td");
      keyCell.textContent = param.key;
      row.appendChild(keyCell);

      // Value cell
      const valueCell = document.createElement("td");
      valueCell.appendChild(this.createValueInput(param, index));
      row.appendChild(valueCell);

      // Action cell
      const actionCell = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.innerHTML = "🗑️";
      removeBtn.onclick = () => this.removeParam(index);
      actionCell.appendChild(removeBtn);
      row.appendChild(actionCell);

      paramsBody.appendChild(row);
    });
  }

  private createValueInput(param: Param, index: number): HTMLElement {
    const container = document.createElement("div");

    switch (param.type) {
      case "boolean":
        const toggleContainer = document.createElement("label");
        toggleContainer.className = "toggle-switch";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = param.value.toLowerCase() === "true";
        checkbox.onchange = (e) =>
          this.updateParamValue(
            index,
            (e.target as HTMLInputElement).checked.toString()
          );
        const slider = document.createElement("span");
        slider.className = "toggle-slider";
        toggleContainer.appendChild(checkbox);
        toggleContainer.appendChild(slider);
        container.appendChild(toggleContainer);
        break;

      case "number":
        const numberInput = document.createElement("input");
        numberInput.type = "number";
        numberInput.className = "param-input";
        numberInput.value = param.value;
        numberInput.onchange = (e) =>
          this.updateParamValue(index, (e.target as HTMLInputElement).value);
        container.appendChild(numberInput);
        break;

      case "date":
        const dateInput = document.createElement("input");
        dateInput.type = "date";
        dateInput.className = "param-input";
        dateInput.value = param.value;
        dateInput.onchange = (e) =>
          this.updateParamValue(index, (e.target as HTMLInputElement).value);
        container.appendChild(dateInput);
        break;

      default:
        const textInput = document.createElement("input");
        textInput.type = "text";
        textInput.className = "param-input";
        textInput.value = param.value;
        textInput.onchange = (e) =>
          this.updateParamValue(index, (e.target as HTMLInputElement).value);
        container.appendChild(textInput);
    }

    return container;
  }

  private updateParamValue(index: number, value: string) {
    if (index >= 0 && index < this.currentParams.length) {
      this.currentParams[index].value = value;
    }
  }

  private removeParam(index: number) {
    this.currentParams.splice(index, 1);
    this.renderParams();
  }

  private addNewParam() {
    const keyInput = document.getElementById("newParamKey") as HTMLInputElement;
    const valueInput = document.getElementById(
      "newParamValue"
    ) as HTMLInputElement;

    if (
      keyInput &&
      valueInput &&
      keyInput.value.trim() &&
      valueInput.value.trim()
    ) {
      const newParam: Param = {
        key: keyInput.value.trim(),
        value: valueInput.value.trim(),
        type: this.detectParamType(valueInput.value.trim()),
      };

      this.currentParams.push(newParam);
      this.renderParams();

      // Clear inputs
      keyInput.value = "";
      valueInput.value = "";
    }
  }

  private async applyChanges() {
    const url = new URL(this.originalUrl);
    url.search = "";

    this.currentParams.forEach((param) => {
      url.searchParams.append(param.key, param.value);
    });

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      await chrome.tabs.update(tab.id, { url: url.toString() });
      this.originalUrl = url.toString();
      this.updateUrlDisplay();
      this.originalParams = [...this.currentParams];
    }
  }

  private resetChanges() {
    this.currentParams = [...this.originalParams];
    this.renderParams();
  }

  private setupEventListeners() {
    document
      .getElementById("refreshBtn")
      ?.addEventListener("click", () => this.loadCurrentUrl());
    document
      .getElementById("addParamBtn")
      ?.addEventListener("click", () => this.addNewParam());
    document
      .getElementById("applyBtn")
      ?.addEventListener("click", () => this.applyChanges());
    document
      .getElementById("resetBtn")
      ?.addEventListener("click", () => this.resetChanges());
  }
}

// Initialize the editor when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ParamsEditor();
});
