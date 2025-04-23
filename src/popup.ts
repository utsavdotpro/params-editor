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
    console.log("ParamsEditor initialized");
    this.initializeElements();
    this.loadCurrentUrl();
    this.setupEventListeners();
  }

  private initializeElements() {
    console.log("Initializing elements");
    // Initialize input elements
    const keyInput = document.getElementById("newParamKey") as HTMLInputElement;
    const valueInput = document.getElementById(
      "newParamValue"
    ) as HTMLInputElement;

    if (keyInput && valueInput) {
      // Add keyboard event listeners for Enter key
      keyInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          valueInput.focus();
        }
      });

      valueInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.addNewParam();
        }
      });
    }
  }

  private async loadCurrentUrl() {
    console.log("Loading current URL");
    try {
      // Get current URL from background script
      const response = await chrome.runtime.sendMessage({
        type: "GET_CURRENT_URL",
      });
      console.log("Received URL response:", response);
      if (response?.url) {
        this.originalUrl = response.url;
        this.updateUrlDisplay();
        this.parseAndDisplayParams();
      } else {
        console.error("Failed to get current URL");
      }
    } catch (error) {
      console.error("Error loading current URL:", error);
    }
  }

  private updateUrlDisplay() {
    const urlDisplay = document.getElementById("urlDisplay");
    if (urlDisplay) {
      urlDisplay.textContent = this.originalUrl;
    }
  }

  private parseAndDisplayParams() {
    try {
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
    } catch (error) {
      console.error("Error parsing URL parameters:", error);
    }
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
      const keyInput = document.createElement("input");
      keyInput.type = "text";
      keyInput.className = "param-input";
      keyInput.value = param.key;
      keyInput.onchange = (e) =>
        this.updateParamKey(index, (e.target as HTMLInputElement).value);
      keyCell.appendChild(keyInput);
      row.appendChild(keyCell);

      // Value cell
      const valueCell = document.createElement("td");
      valueCell.appendChild(this.createValueInput(param, index));
      row.appendChild(valueCell);

      // Action cell
      const actionCell = document.createElement("td");
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      const trashIcon = document.createElement("img");
      trashIcon.src =
        "https://unpkg.com/lucide-static@latest/icons/trash-2.svg";
      trashIcon.className = "icon";
      trashIcon.alt = "Remove";
      removeBtn.appendChild(trashIcon);
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
      this.currentParams[index].type = this.detectParamType(value);
    }
  }

  private updateParamKey(index: number, key: string) {
    if (index >= 0 && index < this.currentParams.length) {
      this.currentParams[index].key = key;
    }
  }

  private removeParam(index: number) {
    this.currentParams.splice(index, 1);
    this.renderParams();
  }

  private addNewParam() {
    console.log("Adding new parameter");
    const keyInput = document.getElementById("newParamKey") as HTMLInputElement;
    const valueInput = document.getElementById(
      "newParamValue"
    ) as HTMLInputElement;

    if (keyInput && valueInput) {
      const key = keyInput.value.trim();
      const value = valueInput.value.trim();

      if (key && value) {
        // Check if key already exists
        const existingIndex = this.currentParams.findIndex(
          (p) => p.key === key
        );
        if (existingIndex >= 0) {
          // Update existing parameter
          this.updateParamValue(existingIndex, value);
        } else {
          // Add new parameter
          const newParam: Param = {
            key,
            value,
            type: this.detectParamType(value),
          };
          this.currentParams.push(newParam);
        }

        this.renderParams();

        // Clear inputs
        keyInput.value = "";
        valueInput.value = "";
        keyInput.focus();
      }
    }
  }

  private async applyChanges() {
    console.log("Applying changes");
    try {
      const url = new URL(this.originalUrl);
      url.search = "";

      this.currentParams.forEach((param) => {
        url.searchParams.append(param.key, param.value);
      });

      const newUrl = url.toString();
      console.log("New URL:", newUrl);

      // Send message to background script to update URL
      await chrome.runtime.sendMessage({
        type: "UPDATE_URL",
        url: newUrl,
      });

      // Update local state
      this.originalUrl = newUrl;
      this.updateUrlDisplay();
      this.originalParams = [...this.currentParams];
    } catch (error) {
      console.error("Error applying changes:", error);
    }
  }

  private resetChanges() {
    console.log("Resetting changes");
    this.currentParams = [...this.originalParams];
    this.renderParams();
  }

  private setupEventListeners() {
    console.log("Setting up event listeners");

    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        console.log("Refresh button clicked");
        this.loadCurrentUrl();
      });
    }

    // Add parameter button
    const addParamBtn = document.getElementById("addParamBtn");
    if (addParamBtn) {
      addParamBtn.addEventListener("click", () => {
        console.log("Add parameter button clicked");
        this.addNewParam();
      });
    }

    // Apply changes button
    const applyBtn = document.getElementById("applyBtn");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        console.log("Apply changes button clicked");
        this.applyChanges();
      });
    }

    // Reset button
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        console.log("Reset button clicked");
        this.resetChanges();
      });
    }
  }
}

// Initialize the editor when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");
  new ParamsEditor();
});
