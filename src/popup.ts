/// <reference types="chrome"/>

import "./global.css";

interface Param {
  key: string;
  value: string;
  type: "string" | "number" | "date" | "boolean" | "list" | "json";
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
const createCell = (className: string = ""): HTMLTableCellElement => {
  const cell = document.createElement("td");
  cell.className = `p-1 text-left ${className}`;
  return cell;
};

const createParamRow = (props: ParamRowProps): HTMLTableRowElement => {
  const { param, index, onKeyChange, onValueChange, onRemove } = props;
  const row = document.createElement("tr");
  // row.className = "border-b border-gray-200";

  // Key cell - give it sufficient fixed width
  const keyCell = createCell("w-[30%]");
  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.className =
    "w-full p-1.5 border border-gray-300 rounded focus:outline-none focus:border-green-500";
  keyInput.value = param.key;
  keyInput.onchange = (e) =>
    onKeyChange(index, (e.target as HTMLInputElement).value);

  // Use the shared addApplyOnEnterHandler function
  addApplyOnEnterHandler(keyInput);

  keyCell.appendChild(keyInput);
  row.appendChild(keyCell);

  // Value cell - let it take remaining space but not push others out
  const valueCell = createCell("w-[65%] overflow-hidden");
  valueCell.appendChild(createValueInput({ param, index, onValueChange }));
  row.appendChild(valueCell);

  // Action cell - ensure fixed width
  const actionCell = createCell("w-[5%] !py-0");
  actionCell.appendChild(createRemoveButton(() => onRemove(index)));
  row.appendChild(actionCell);

  return row;
};

// Add an Enter key handler to an input that applies changes when Enter is pressed
const addApplyOnEnterHandler = (input: HTMLElement) => {
  if (
    input instanceof HTMLInputElement ||
    input instanceof HTMLTextAreaElement
  ) {
    input.addEventListener("keypress", (e: Event) => {
      if ((e as KeyboardEvent).key === "Enter") {
        // Find the params editor instance and apply changes
        const paramsEditor = (window as any).paramsEditorInstance;
        if (paramsEditor && typeof paramsEditor.applyChanges === "function") {
          paramsEditor.applyChanges();
        }
      }
    });
  }
};

const createValueInput = (props: ValueInputProps): HTMLElement => {
  const { param, index, onValueChange } = props;
  const container = document.createElement("div");
  container.className = "w-full";

  // Log param key and type for debugging
  console.log(
    `createValueInput - Param: ${param.key}, Type: ${param.type}, Value: ${param.value.substring(0, 50)}`
  );

  switch (param.type) {
    case "boolean":
      const booleanInput = createBooleanInput(param.value, (value) =>
        onValueChange(index, value)
      );
      container.appendChild(booleanInput);
      break;

    case "number":
      const numberInput = createNumberInput(param.value, (value) =>
        onValueChange(index, value)
      );
      container.appendChild(numberInput);
      addApplyOnEnterHandler(numberInput);
      break;

    case "date":
      const dateInput = createDateInput(param.value, (value) =>
        onValueChange(index, value)
      );
      container.appendChild(dateInput);
      addApplyOnEnterHandler(dateInput);
      break;

    case "list":
      container.appendChild(
        createListInput(
          param.value,
          (value) => onValueChange(index, value),
          param.key
        )
      );
      break;

    case "json":
      console.log("Creating JSON input for:", param.key);
      container.appendChild(
        createJsonInput(
          param.value,
          (value) => onValueChange(index, value),
          param.key
        )
      );
      break;

    default:
      const textInput = createTextInput(param.value, (value) =>
        onValueChange(index, value)
      );
      container.appendChild(textInput);
      addApplyOnEnterHandler(textInput);
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

  // Format the date value to YYYY-MM-DD for HTML date input
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      dateInput.value = `${year}-${month}-${day}`;
    } else {
      dateInput.value = value;
    }
  } catch (e) {
    dateInput.value = value;
  }

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

const createListInput = (
  value: string,
  onChange: (value: string) => void,
  paramKey: string
): HTMLElement => {
  const container = document.createElement("div");
  container.className = "w-full relative";

  // Ensure we're working with decoded values
  let decodedValue = value;
  try {
    if (value.includes("%")) {
      decodedValue = decodeURIComponent(value);
      console.log(`List Input - Decoded:`, decodedValue);
    }
  } catch (e) {
    console.log(`List Input - Decoding failed:`, e);
    decodedValue = value;
  }

  // Parse the comma-separated value into an array
  const selectedValues = decodedValue
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v);

  // Preview container shows chips like before (read-only)
  const previewContainer = document.createElement("div");
  previewContainer.className =
    "list-preview p-1.5 border border-gray-300 rounded cursor-pointer hover:border-green-500 bg-gray-50 min-h-[38px] flex flex-wrap items-center gap-1 w-full overflow-hidden";

  // Function to update the preview display
  const updatePreview = (values: string[]) => {
    // Clear the preview
    while (previewContainer.firstChild) {
      previewContainer.removeChild(previewContainer.firstChild);
    }

    // Add chips for each value
    values.forEach((itemValue) => {
      if (!itemValue) return;

      const itemChip = document.createElement("div");
      itemChip.className =
        "selected-item bg-green-100 text-green-800 rounded px-2 py-0.5 text-xs flex items-center cursor-text";

      const itemText = document.createElement("span");
      itemText.textContent = itemValue;
      itemText.className = "cursor-text";

      itemChip.appendChild(itemText);

      previewContainer.appendChild(itemChip);
    });

    // Add edit icon or placeholder text
    if (values.length === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "text-gray-400 text-xs";
      placeholder.textContent = "Click to edit list...";
      previewContainer.appendChild(placeholder);
    } else {
      const editIcon = createIcon("pencil", "Edit List");
      editIcon.className = "w-4 h-4 ml-auto text-gray-500 flex-shrink-0";
      previewContainer.appendChild(editIcon);
    }
  };

  // Initial preview update
  updatePreview(selectedValues);
  container.appendChild(previewContainer);

  // Copy the array for editing
  const editingValues = [...selectedValues];

  // Create multiselect container for modal body
  const multiSelectContainer = document.createElement("div");
  multiSelectContainer.className =
    "w-full border border-gray-300 rounded focus-within:border-green-500 overflow-hidden";

  // Input container holds selected items and input field
  const inputContainer = document.createElement("div");
  inputContainer.className = "flex flex-wrap p-1.5 min-h-[38px] gap-1";

  // Function to render all selected items in the editor
  const renderSelectedItems = () => {
    // Clear previous items
    const existingItems = inputContainer.querySelectorAll(".selected-item");
    existingItems.forEach((item) => item.remove());

    // Add selected items before the input
    editingValues.forEach((itemValue, itemIndex) => {
      if (!itemValue) return;

      const itemChip = document.createElement("div");
      itemChip.className =
        "selected-item bg-green-100 text-green-800 rounded px-2 py-0.5 text-xs flex items-center cursor-text";

      const itemText = document.createElement("span");
      itemText.textContent = itemValue;
      itemText.className = "cursor-text";

      // Add edit functionality
      itemText.onclick = (e) => {
        e.stopPropagation();

        const editSpan = document.createElement("span");
        editSpan.contentEditable = "true";
        editSpan.className =
          "outline-none bg-green-50 text-xs py-0.5 min-w-[1.25rem] inline-block cursor-text";
        editSpan.textContent = itemValue;

        // Prevent event bubbling that might interfere with cursor positioning
        editSpan.addEventListener("click", (e) => {
          e.stopPropagation();
        });

        // Handle saving edits
        const saveEdit = () => {
          const newValue = editSpan.textContent?.trim() || "";
          if (newValue && newValue !== itemValue) {
            // Update the value in our array
            editingValues[itemIndex] = newValue;
            renderSelectedItems();
          } else if (!newValue) {
            // Remove item if edited to empty
            editingValues.splice(itemIndex, 1);
            renderSelectedItems();
          } else {
            // Value unchanged, just re-render
            renderSelectedItems();
          }
        };

        // Add a flag to prevent duplicate processing
        let isProcessing = false;

        // Save on enter or blur
        editSpan.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            isProcessing = true;
            saveEdit();
          } else if (e.key === "Escape") {
            isProcessing = true;
            renderSelectedItems(); // Cancel edit
          }
        });

        editSpan.addEventListener("blur", () => {
          // Only process blur if keydown didn't already handle it
          if (!isProcessing) saveEdit();
        });

        itemChip.replaceChild(editSpan, itemText);
        setTimeout(() => {
          editSpan.focus();
        }, 0);
      };

      itemChip.appendChild(itemText);

      // Add remove button
      const removeBtn = document.createElement("span");
      removeBtn.textContent = "×";
      removeBtn.className = "ml-1 cursor-pointer text-red-700 font-semibold";
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        const index = editingValues.indexOf(itemValue);
        if (index !== -1) {
          editingValues.splice(index, 1);
          renderSelectedItems();
        }
      };

      itemChip.appendChild(removeBtn);
      inputContainer.insertBefore(itemChip, inputField);
    });
  };

  // Input field for new items
  const inputField = document.createElement("input");
  inputField.type = "text";
  inputField.className = "outline-none border-none flex-grow min-w-[50px]";
  inputField.placeholder = "Add item...";

  // Handle adding new items
  inputField.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newValue = inputField.value.trim();

      if (newValue && !editingValues.includes(newValue)) {
        editingValues.push(newValue);
        inputField.value = "";
        renderSelectedItems();
      }
    } else if (
      e.key === "Backspace" &&
      inputField.value === "" &&
      editingValues.length > 0
    ) {
      // Remove the last item when backspace is pressed and input is empty
      editingValues.pop();
      renderSelectedItems();
    }
  });

  // Focus the container when clicked
  multiSelectContainer.addEventListener("click", () => {
    inputField.focus();
  });

  // Add input field to container
  inputContainer.appendChild(inputField);
  multiSelectContainer.appendChild(inputContainer);

  // Create modal with the reusable component
  const { showModal, hideModal, cleanup } = createModal({
    title: `Edit ${paramKey}`,
    bodyContent: multiSelectContainer,
    onSave: () => {
      // Join the values and save
      const newListValue = editingValues.join(",");
      onChange(newListValue);

      // Update the preview
      updatePreview(editingValues);

      hideModal();
    },
    onCancel: () => {
      // Reset the editing values on cancel
      editingValues.length = 0;
      selectedValues.forEach((v) => editingValues.push(v));
    },
  });

  // Show modal when preview is clicked
  previewContainer.onclick = () => {
    // Reset the editing values
    editingValues.length = 0;
    selectedValues.forEach((v) => editingValues.push(v));

    // Render the items
    setTimeout(() => renderSelectedItems(), 0);

    showModal();
    inputField.focus();
  };

  // Cleanup modal when container is removed
  const observer = new MutationObserver((mutationsList, obs) => {
    for (const mutation of mutationsList) {
      if (mutation.removedNodes) {
        mutation.removedNodes.forEach((node) => {
          if (node === container) {
            cleanup();
            obs.disconnect();
            return;
          }
        });
      }
    }
  });

  observer.observe(container.parentNode || document.body, {
    childList: true,
    subtree: true,
  });

  return container;
};

// New component for JSON input
const createJsonInput = (
  value: string,
  onChange: (value: string) => void,
  paramKey: string
): HTMLElement => {
  const container = document.createElement("div");
  container.className = "w-full relative";

  // Ensure we're working with a decoded value
  let decodedValue = value;
  try {
    if (value.includes("%")) {
      decodedValue = decodeURIComponent(value);
      console.log(`JSON Input - Decoded:`, decodedValue);
    }
  } catch (e) {
    console.log(`JSON Input - Decoding failed:`, e);
    decodedValue = value;
  }

  const previewContainer = document.createElement("div");
  previewContainer.className =
    "json-preview p-1.5 border border-gray-300 rounded cursor-pointer hover:border-green-500 bg-gray-50 min-h-[38px] flex items-center justify-between w-full overflow-hidden";

  const previewText = document.createElement("code");
  previewText.className =
    "text-xs text-gray-600 truncate block w-[90%] overflow-hidden text-ellipsis"; // Better overflow handling
  try {
    // Try to parse and prettify, fallback to raw value
    const parsed = JSON.parse(decodedValue);
    previewText.textContent = JSON.stringify(parsed, null, 2).substring(0, 100);
    if (JSON.stringify(parsed).length > 100) {
      previewText.textContent += "...";
    }
  } catch {
    previewText.textContent = decodedValue.substring(0, 100);
    if (decodedValue.length > 100) {
      previewText.textContent += "...";
    }
  }
  previewContainer.appendChild(previewText);

  const editIcon = createIcon("pencil", "Edit JSON");
  editIcon.className = "w-4 h-4 ml-2 text-gray-500 flex-shrink-0";
  previewContainer.appendChild(editIcon);

  container.appendChild(previewContainer);

  // Create textarea for JSON editing
  const textarea = document.createElement("textarea");
  textarea.className =
    "w-full min-h-32 h-64 max-h-full p-2 border border-gray-300 rounded focus:outline-none focus:border-green-500 font-mono text-sm";
  textarea.placeholder = "Enter valid JSON here...";

  // Create error message element
  const errorMsg = document.createElement("div");
  errorMsg.className = "text-red-600 text-xs mr-auto hidden";

  // Create modal with reusable component
  const { showModal, hideModal, cleanup } = createModal({
    title: `Edit ${paramKey}`,
    bodyContent: textarea,
    errorMsg: errorMsg,
    onSave: () => {
      try {
        const newValue = textarea.value;
        JSON.parse(newValue); // Validate JSON
        onChange(newValue); // Pass the raw (but validated) string back - keep it decoded

        // Update preview with the new decoded value
        try {
          const parsed = JSON.parse(newValue);
          previewText.textContent = JSON.stringify(parsed, null, 2).substring(
            0,
            100
          );
          if (JSON.stringify(parsed).length > 100) {
            previewText.textContent += "...";
          }
        } catch {
          previewText.textContent = newValue.substring(0, 100);
          if (newValue.length > 100) {
            previewText.textContent += "...";
          }
        }

        hideModal();
        errorMsg.classList.add("hidden");
      } catch (err) {
        errorMsg.textContent = "Invalid JSON: " + (err as Error).message;
        errorMsg.classList.remove("hidden");
        textarea.focus(); // Keep focus on textarea if error
      }
    },
  });

  // Show modal when preview is clicked
  previewContainer.onclick = () => {
    try {
      // Prettify JSON in textarea for editing
      const parsed = JSON.parse(decodedValue);
      textarea.value = JSON.stringify(parsed, null, 2);
    } catch {
      textarea.value = decodedValue; // Fallback to raw value if parsing fails
    }
    errorMsg.classList.add("hidden"); // Clear previous errors
    showModal();
    textarea.focus(); // Focus textarea when modal opens
  };

  // Cleanup modal when container is removed
  const observer = new MutationObserver((mutationsList, obs) => {
    for (const mutation of mutationsList) {
      if (mutation.removedNodes) {
        mutation.removedNodes.forEach((node) => {
          if (node === container) {
            cleanup();
            obs.disconnect();
            return;
          }
        });
      }
    }
  });

  observer.observe(container.parentNode || document.body, {
    childList: true,
    subtree: true,
  });

  return container;
};

const createIcon = (iconName: string, alt: string): HTMLImageElement => {
  const icon = document.createElement("img");
  icon.src = `https://unpkg.com/lucide-static@latest/icons/${iconName}.svg`;
  icon.className = "w-4 h-4 align-text-bottom stroke-current fill-none";
  icon.alt = alt;
  return icon;
};

// Create a reusable modal component
interface ModalOptions {
  title: string;
  bodyContent: HTMLElement;
  onSave: () => void;
  onCancel?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  errorMsg?: HTMLElement;
}

const createModal = (
  options: ModalOptions
): {
  modalElement: HTMLElement;
  showModal: () => void;
  hideModal: () => void;
  cleanup: () => void;
} => {
  const modal = document.createElement("div");
  modal.className =
    "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 hidden";
  modal.onclick = (e) => {
    // Close modal if backdrop is clicked
    if (e.target === modal) {
      hideModal();
      if (options.onCancel) options.onCancel();
    }
  };

  const modalContent = document.createElement("div");
  modalContent.className =
    "bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col";

  const modalHeader = document.createElement("div");
  modalHeader.className =
    "p-3 border-b border-gray-200 text-lg font-semibold text-gray-700";
  modalHeader.textContent = options.title;

  const modalBody = document.createElement("div");
  modalBody.className = "p-4 overflow-y-auto";
  modalBody.appendChild(options.bodyContent);

  const modalFooter = document.createElement("div");
  modalFooter.className = "p-3 border-t border-gray-200 flex justify-end gap-2";

  // Add error message if provided
  if (options.errorMsg) {
    modalFooter.appendChild(options.errorMsg);
  }

  const cancelButton = document.createElement("button");
  cancelButton.textContent = options.cancelLabel || "Cancel";
  cancelButton.className =
    "px-4 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300";
  cancelButton.onclick = () => {
    hideModal();
    if (options.onCancel) options.onCancel();
  };

  const saveButton = document.createElement("button");
  saveButton.textContent = options.saveLabel || "Save";
  saveButton.className =
    "px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700";
  saveButton.onclick = () => {
    options.onSave();
  };

  modalFooter.appendChild(cancelButton);
  modalFooter.appendChild(saveButton);

  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modalContent.appendChild(modalFooter);
  modal.appendChild(modalContent);

  // Add modal to the body, but keep it hidden initially
  document.body.appendChild(modal);

  const showModal = () => {
    modal.classList.remove("hidden");
  };

  const hideModal = () => {
    modal.classList.add("hidden");
  };

  const cleanup = () => {
    modal.remove();
  };

  return { modalElement: modal, showModal, hideModal, cleanup };
};

const createRemoveButton = (onClick: () => void): HTMLButtonElement => {
  const removeBtn = document.createElement("button");
  removeBtn.className = "cursor-pointer inline-block align-middle";

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
    // Store a reference to this instance for global access
    (window as any).paramsEditorInstance = this;
    this.initializeElements();
    this.loadCurrentUrl();
    this.setupEventListeners();
  }

  private initializeElements() {
    // Ensure all DOM elements are found before proceeding
    this.checkRequiredElements();

    // Initialize input elements
    const keyInput = document.getElementById("newParamKey") as HTMLInputElement;
    const valueInput = document.getElementById(
      "newParamValue"
    ) as HTMLInputElement;

    if (keyInput && valueInput) {
      // Add keyboard event listeners for navigation
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

  private checkRequiredElements() {
    // Check that all required DOM elements exist
    const requiredElements = [
      "urlDisplay",
      "paramsBody",
      "addParamBtn",
      "applyBtn",
      "resetBtn",
      "refreshBtn",
    ];

    const missingElements = requiredElements.filter(
      (id) => !document.getElementById(id)
    );

    if (missingElements.length > 0) {
      console.error("Missing required DOM elements:", missingElements);
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
      try {
        const url = new URL(this.originalUrl);
        const baseUrl = `${url.origin}${url.pathname}`;

        // Clear previous content
        urlDisplay.innerHTML = "";

        // Add the base URL
        const baseUrlSpan = document.createElement("span");
        baseUrlSpan.textContent = baseUrl;
        urlDisplay.appendChild(baseUrlSpan);

        // Add the query parameters with colored keys
        if (url.search) {
          const searchParts = url.search.substring(1).split("&");

          if (searchParts.length > 0) {
            urlDisplay.appendChild(document.createTextNode("?"));

            searchParts.forEach((part, index) => {
              if (index > 0) {
                urlDisplay.appendChild(document.createTextNode("&"));
              }

              const [key, value] = part.split("=");

              // Add key with color
              const keySpan = document.createElement("span");
              keySpan.textContent = key;
              keySpan.className = "text-green-600 font-medium";
              urlDisplay.appendChild(keySpan);

              // Add equals sign and value
              if (value !== undefined) {
                urlDisplay.appendChild(document.createTextNode("="));
                urlDisplay.appendChild(document.createTextNode(value));
              }
            });
          }
        }

        // Add hash if present
        if (url.hash) {
          urlDisplay.appendChild(document.createTextNode(url.hash));
        }
      } catch (error) {
        // Fallback to plain text if URL parsing fails
        urlDisplay.textContent = this.originalUrl;
      }
    }
  }

  private parseAndDisplayParams() {
    try {
      const url = new URL(this.originalUrl);
      this.currentParams = [];
      this.originalParams = [];

      // Parse URL parameters and convert to Param objects
      url.searchParams.forEach((value, key) => {
        if (key.trim()) {
          // Ensure we don't add empty keys
          const param: Param = {
            key,
            value,
            type: this.detectParamType(value),
          };
          this.currentParams.push(param);
          // Create deep copies for originalParams to avoid reference issues
          this.originalParams.push({ ...param });
        }
      });

      this.renderParams();
      this.updateParamsCount();
    } catch (error) {
      console.error("Error parsing URL parameters:", error);
    }
  }

  private detectParamType(value: string): Param["type"] {
    // Log the initial value received
    console.log(`detectParamType - Input: '${value}'`);

    // Empty or whitespace-only values default to string
    if (!value || value.trim() === "") {
      console.log(`detectParamType - Result: string (empty)`);
      return "string";
    }

    // Try to decode URL-encoded values first
    let decodedValue = value;
    try {
      // Only decode if it contains URL-encoded characters
      if (value.includes("%")) {
        decodedValue = decodeURIComponent(value);
        console.log(`detectParamType - Decoded: '${decodedValue}'`);
      }
    } catch (e) {
      console.log(`detectParamType - Decoding failed: ${e}`);
      // If decoding fails, use the original value
      decodedValue = value;
    }

    // Trim the value for accurate detection
    const trimmedValue = decodedValue.trim();
    console.log(`detectParamType - Trimmed: '${trimmedValue}'`);

    // JSON detection (Object or Array)
    if (
      (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) ||
      (trimmedValue.startsWith("[") && trimmedValue.endsWith("]"))
    ) {
      console.log(`detectParamType - Potential JSON detected`);
      try {
        // Attempt to parse to validate JSON structure
        JSON.parse(trimmedValue);
        console.log(`detectParamType - Result: json (validated)`);
        return "json"; // It's valid JSON
      } catch (e) {
        console.log(
          `detectParamType - Result: string (JSON parse failed: ${e})`
        );
        // Parsing failed, treat as string
        return "string";
      }
    }

    // Boolean detection
    if (
      trimmedValue.toLowerCase() === "true" ||
      trimmedValue.toLowerCase() === "false"
    ) {
      console.log(`detectParamType - Result: boolean`);
      return "boolean";
    }

    // Number detection - ensure it's a valid number format
    if (/^-?\d+(\.\d+)?$/.test(trimmedValue) && !isNaN(Number(trimmedValue))) {
      console.log(`detectParamType - Result: number`);
      return "number";
    }

    // Date detection - try parsing with stricter validation
    if (this.isValidDate(trimmedValue)) {
      console.log(`detectParamType - Result: date`);
      return "date";
    }

    // List detection - check for comma-separated values
    if (trimmedValue.includes(",")) {
      // Skip detection for JSON-like structures (arrays, objects)
      const hasJsonStructure =
        // Check for JSON array pattern
        (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) ||
        // Check for JSON object pattern
        (trimmedValue.startsWith("{") && trimmedValue.endsWith("}"));

      if (!hasJsonStructure) {
        // Handle trailing commas and still detect as list
        const listValue = trimmedValue.endsWith(",")
          ? trimmedValue.slice(0, -1)
          : trimmedValue;
        // Make sure we have actual values (not just commas)
        const hasValues = listValue
          .split(",")
          .some((item: string) => item.trim() !== "");
        if (hasValues) {
          console.log(`detectParamType - Result: list`);
          return "list";
        }
      }
    }

    // Default to string for anything else
    console.log(`detectParamType - Result: string (default)`);
    return "string";
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private renderParams() {
    const paramsBody = document.getElementById("paramsBody");
    if (!paramsBody) {
      console.error("paramsBody element not found");
      return;
    }

    // Find the parent table and ensure it has proper layout
    const paramsTable = paramsBody.closest("table");
    if (paramsTable) {
      paramsTable.className = "w-full table-fixed";
    }

    // Update params count
    this.updateParamsCount();

    // Clear the current table body
    paramsBody.innerHTML = "";

    // Early return if no parameters
    if (this.currentParams.length === 0) {
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 3;
      emptyCell.className = "p-4 text-center text-gray-500 italic";
      emptyCell.textContent = "No parameters. Add one below.";
      emptyRow.appendChild(emptyCell);
      paramsBody.appendChild(emptyRow);
      return;
    }

    // Render each parameter
    this.currentParams.forEach((param, index) => {
      try {
        const row = createParamRow({
          param,
          index,
          onKeyChange: this.updateParamKey.bind(this),
          onValueChange: this.updateParamValue.bind(this),
          onRemove: this.removeParam.bind(this),
        });
        paramsBody.appendChild(row);
      } catch (error) {
        console.error(`Error rendering parameter row ${index}:`, error);
      }
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
    if (index >= 0 && index < this.currentParams.length) {
      this.currentParams.splice(index, 1);
      this.renderParams();
    }
  }

  private updateParamsCount() {
    const paramsCount = document.getElementById("paramsCount");
    if (paramsCount) {
      paramsCount.textContent = this.currentParams.length.toString();
    }
  }

  private addNewParam() {
    const keyInput = document.getElementById("newParamKey") as HTMLInputElement;
    const valueInput = document.getElementById(
      "newParamValue"
    ) as HTMLInputElement;

    if (keyInput && valueInput) {
      const key = keyInput.value.trim();
      const value = valueInput.value.trim();

      if (key) {
        // Allow empty values but not empty keys
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
      } else {
        // Show error for empty key
        alert("Parameter key cannot be empty");
        keyInput.focus();
      }
    }
  }

  private async applyChanges() {
    try {
      // Check if there are values in the new param input fields and add them first
      const keyInput = document.getElementById(
        "newParamKey"
      ) as HTMLInputElement;
      const valueInput = document.getElementById(
        "newParamValue"
      ) as HTMLInputElement;

      if (keyInput && valueInput && keyInput.value.trim()) {
        // If we have a key in the input field, add it before applying changes
        this.addNewParam();
      }

      // Validate parameters before applying changes
      const invalidParams = this.currentParams.filter(
        (param) => !param.key.trim()
      );
      if (invalidParams.length > 0) {
        throw new Error(
          `Cannot apply changes: ${invalidParams.length} parameter(s) have empty keys`
        );
      }

      const url = new URL(this.originalUrl);
      url.search = "";

      // Create a new URLSearchParams object for better control
      const searchParams = new URLSearchParams();

      // Add each parameter, with proper encoding
      this.currentParams.forEach((param) => {
        if (param.key.trim()) {
          // Extra validation to ensure we don't add empty keys
          searchParams.append(param.key, param.value);
        }
      });

      // Set the search property directly from the URLSearchParams object
      url.search = searchParams.toString();

      const newUrl = url.toString();

      // Send message to background script to update URL
      const response = await chrome.runtime.sendMessage({
        type: "UPDATE_URL",
        url: newUrl,
      });

      if (response && response.error) {
        throw new Error(`Background script error: ${response.error}`);
      }

      // Update local state
      this.originalUrl = newUrl;
      this.updateUrlDisplay();

      // Create a deep copy of current params to avoid reference issues
      this.originalParams = this.currentParams.map((param) => ({ ...param }));

      // Update params count
      this.updateParamsCount();
    } catch (error) {
      console.error("Error applying changes:", error);

      // Show a simplified error message to the user
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("Failed to apply changes");
      }
    }
  }

  private resetChanges() {
    this.currentParams = [...this.originalParams];
    this.renderParams();
    this.updateParamsCount();
  }

  private setupEventListeners() {
    // Use a more robust method to ensure event listeners are properly attached
    this.attachEventListener("refreshBtn", "click", () => {
      // First reload the current URL from the tab
      this.loadCurrentUrl();
      // Also refresh the actual tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
      });
    });

    this.attachEventListener("addParamBtn", "click", () => {
      this.addNewParam();
    });

    this.attachEventListener("applyBtn", "click", async () => {
      await this.applyChanges();
    });

    this.attachEventListener("resetBtn", "click", () => {
      this.resetChanges();
    });
  }

  private attachEventListener(
    elementId: string,
    eventType: string,
    handler: EventListener
  ) {
    const element = document.getElementById(elementId);
    if (element) {
      // Remove any existing listeners first to prevent duplicates
      element.removeEventListener(eventType, handler);
      // Add the new listener
      element.addEventListener(eventType, handler);
    } else {
      console.error(
        `Failed to attach event listener: element #${elementId} not found`
      );
    }
  }
}

// Initialize the editor when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");
  new ParamsEditor();
});
