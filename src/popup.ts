/// <reference types="chrome"/>

import "./global.css";

interface Param {
  key: string;
  value: string;
  type: "string" | "number" | "date" | "boolean";
}

// Reusable component interfaces
interface ParamRowProps {
  param: Param;
  index: number;
  onKeyChange: (index: number, key: string) => void;
  onValueChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

interface ValueInputProps {
  param: Param;
  index: number;
  onValueChange: (index: number, value: string) => void;
}

// Reusable functional components with Tailwind CSS classes
const createParamRow = (props: ParamRowProps): HTMLTableRowElement => {
  const { param, index, onKeyChange, onValueChange, onRemove } = props;
  const row = document.createElement("tr");
  row.className = "border-b border-gray-200";

  // Key cell
  const keyCell = document.createElement("td");
  keyCell.className = "p-2 text-left";
  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.className =
    "w-full p-1.5 border border-gray-300 rounded focus:outline-none focus:border-green-500";
  keyInput.value = param.key;
  keyInput.onchange = (e) =>
    onKeyChange(index, (e.target as HTMLInputElement).value);
  keyCell.appendChild(keyInput);
  row.appendChild(keyCell);

  // Value cell
  const valueCell = document.createElement("td");
  valueCell.className = "p-2 text-left";
  valueCell.appendChild(createValueInput({ param, index, onValueChange }));
  row.appendChild(valueCell);

  // Action cell
  const actionCell = document.createElement("td");
  actionCell.className = "p-2 text-left";
  actionCell.appendChild(createRemoveButton(() => onRemove(index)));
  row.appendChild(actionCell);

  return row;
};

const createValueInput = (props: ValueInputProps): HTMLElement => {
  const { param, index, onValueChange } = props;
  const container = document.createElement("div");
  container.className = "w-full";

  switch (param.type) {
    case "boolean":
      container.appendChild(
        createBooleanInput(param.value, (value) => onValueChange(index, value))
      );
      break;

    case "number":
      container.appendChild(
        createNumberInput(param.value, (value) => onValueChange(index, value))
      );
      break;

    case "date":
      container.appendChild(
        createDateInput(param.value, (value) => onValueChange(index, value))
      );
      break;

    default:
      container.appendChild(
        createTextInput(param.value, (value) => onValueChange(index, value))
      );
  }

  return container;
};

const createBooleanInput = (
  value: string,
  onChange: (value: string) => void
): HTMLElement => {
  const toggleContainer = document.createElement("label");
  toggleContainer.className = "relative inline-block w-[50px] h-6";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "opacity-0 w-0 h-0";
  checkbox.checked = value.toLowerCase() === "true";
  checkbox.onchange = (e) =>
    onChange((e.target as HTMLInputElement).checked.toString());

  const slider = document.createElement("span");
  slider.className =
    "absolute cursor-pointer inset-0 bg-gray-400 transition-all rounded-full before:absolute before:content-[''] before:h-4 before:w-4 before:left-1 before:bottom-1 before:bg-white before:transition-all before:rounded-full";

  // Set initial state based on value
  if (checkbox.checked) {
    slider.classList.add("bg-green-500");
    slider.classList.add("before:translate-x-[26px]");
  }

  toggleContainer.appendChild(checkbox);
  toggleContainer.appendChild(slider);

  // Add custom styling for checked state on change
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      slider.classList.add("bg-green-500");
      slider.classList.add("before:translate-x-[26px]");
    } else {
      slider.classList.remove("bg-green-500");
      slider.classList.remove("before:translate-x-[26px]");
    }
  });

  return toggleContainer;
};

const createNumberInput = (
  value: string,
  onChange: (value: string) => void
): HTMLInputElement => {
  const numberInput = document.createElement("input");
  numberInput.type = "number";
  numberInput.className =
    "w-full p-1.5 border border-gray-300 rounded focus:outline-none focus:border-green-500";
  numberInput.value = value;
  numberInput.onchange = (e) => onChange((e.target as HTMLInputElement).value);

  return numberInput;
};

const createDateInput = (
  value: string,
  onChange: (value: string) => void
): HTMLInputElement => {
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.className =
    "w-full p-1.5 border border-gray-300 rounded focus:outline-none focus:border-green-500";
  dateInput.value = value;
  dateInput.onchange = (e) => onChange((e.target as HTMLInputElement).value);

  return dateInput;
};

const createTextInput = (
  value: string,
  onChange: (value: string) => void
): HTMLInputElement => {
  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.className =
    "w-full p-1.5 border border-gray-300 rounded focus:outline-none focus:border-green-500";
  textInput.value = value;
  textInput.onchange = (e) => onChange((e.target as HTMLInputElement).value);

  return textInput;
};

const createIcon = (iconName: string, alt: string): HTMLImageElement => {
  const icon = document.createElement("img");
  icon.src = `https://unpkg.com/lucide-static@latest/icons/${iconName}.svg`;
  icon.className = "w-5 h-5 align-text-bottom stroke-current fill-none";
  icon.alt = alt;
  return icon;
};

const createRemoveButton = (onClick: () => void): HTMLButtonElement => {
  const removeBtn = document.createElement("button");
  removeBtn.className =
    "bg-transparent border-0 text-red-500 cursor-pointer p-1 hover:text-red-700";

  const trashIcon = createIcon("trash-2", "Remove");

  removeBtn.appendChild(trashIcon);
  removeBtn.onclick = onClick;

  return removeBtn;
};

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
      const row = createParamRow({
        param,
        index,
        onKeyChange: this.updateParamKey.bind(this),
        onValueChange: this.updateParamValue.bind(this),
        onRemove: this.removeParam.bind(this),
      });
      paramsBody.appendChild(row);
    });
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
