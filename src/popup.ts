/// <reference types="chrome"/>

import "./global.css";

interface Param {
  key: string;
  value: string;
  type: "string" | "number" | "date" | "boolean" | "list" | "json";
}

// Utility function to debounce function calls
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;

  return function (...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, wait) as unknown as number;
  };
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

  // Key cell - give it sufficient fixed width
  const keyCell = createCell("w-[30%]");
  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.className =
    "w-full p-1.5 border border-gray-300 rounded focus:outline-none focus:border-green-500";
  keyInput.value = param.key;

  // Add input event listener to catch all changes including when typing
  keyInput.addEventListener("input", (e) => {
    const newValue = (e.target as HTMLInputElement).value;
    console.log(`Key input changed to: ${newValue}`);
    onKeyChange(index, newValue);
  });

  // Keep onchange for compatibility
  keyInput.onchange = (e) =>
    onKeyChange(index, (e.target as HTMLInputElement).value);

  // Use the shared addApplyOnEnterHandler function
  addApplyOnEnterHandler(keyInput);

  // Add Ctrl/CMD + X handler for key input
  keyInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "x") {
      e.preventDefault();
      const editor = (window as any).paramsEditorInstance;
      if (editor) {
        const paramToUpdate = editor.currentParams[index];
        if (paramToUpdate && paramToUpdate.type !== "string") {
          paramToUpdate.type = "string";
          editor.cachedUnfilteredFragment = null;
          editor.renderParams();

          // Defer focus until after the re-render
          setTimeout(() => {
            editor.focusValueInput(index);
          }, 0);
        }
      }
    }
  });

  keyCell.appendChild(keyInput);
  row.appendChild(keyCell);

  // Value cell - let it take remaining space but not push others out
  const valueCell = createCell("w-[65%] overflow-hidden");
  const valueContainer = createValueInput({ param, index, onValueChange });
  valueCell.appendChild(valueContainer);
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
          // Prevent default form submission behavior
          e.preventDefault();

          // Apply changes through the editor instance which will show the spinner
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
  checkbox.onchange = (e) => {
    const newValue = (e.target as HTMLInputElement).checked.toString();
    console.log(`Boolean changed to: ${newValue}`);
    onChange(newValue);
  };

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

  // Create debounced version of the change handler
  const debouncedOnChange = debounce((newValue: string) => {
    console.log(`Number input changed to: ${newValue}`);
    onChange(newValue);
  }, 150);

  // Add input event listener with debounce
  numberInput.addEventListener("input", (e) => {
    const newValue = (e.target as HTMLInputElement).value;
    debouncedOnChange(newValue);
  });

  // Keep onchange for compatibility but also debounce it
  numberInput.addEventListener("change", (e) => {
    const newValue = (e.target as HTMLInputElement).value;
    debouncedOnChange(newValue);
  });

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

  // Create debounced version of the change handler
  const debouncedOnChange = debounce((newValue: string) => {
    console.log(`Date input changed to: ${newValue}`);
    onChange(newValue);
  }, 150);

  // Add input event listener with debounce
  dateInput.addEventListener("input", (e) => {
    const newValue = (e.target as HTMLInputElement).value;
    debouncedOnChange(newValue);
  });

  // Keep onchange for compatibility but also debounce it
  dateInput.addEventListener("change", (e) => {
    const newValue = (e.target as HTMLInputElement).value;
    debouncedOnChange(newValue);
  });

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

  // Create debounced version of the change handler
  const debouncedOnChange = debounce((newValue: string) => {
    console.log(`Text input changed to: ${newValue}`);
    onChange(newValue);
  }, 150);

  // Add input event listener with debounce
  textInput.addEventListener("input", (e) => {
    const newValue = (e.target as HTMLInputElement).value;
    debouncedOnChange(newValue);
  });

  // Keep onchange for compatibility but also debounce it
  textInput.addEventListener("change", (e) => {
    const newValue = (e.target as HTMLInputElement).value;
    debouncedOnChange(newValue);
  });

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
            console.log(
              `List item edited: from "${itemValue}" to "${newValue}"`
            );
            renderSelectedItems();
          } else if (!newValue) {
            // Remove item if edited to empty
            console.log(`List item removed: "${itemValue}"`);
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

// New utility for efficient JSON operations
const jsonUtils = {
  // Safely parse JSON with error handling
  tryParse(value: string): { valid: boolean; parsed?: any } {
    try {
      const parsed = JSON.parse(value);
      return { valid: true, parsed };
    } catch (e) {
      return { valid: false };
    }
  },

  // Create an abbreviated preview of JSON data efficiently
  createPreview(value: string, maxLength: number = 100): string {
    // For very large values, avoid full parsing
    if (value.length > 10000) {
      // Just take the first part of the string for extremely large values
      return value.substring(0, maxLength) + "...";
    }

    const result = this.tryParse(value);
    if (result.valid) {
      try {
        // For large objects, use a faster approach than full stringify
        if (value.length > 1000) {
          // Extract just the first few keys or array elements
          return this.createFastPreview(result.parsed, maxLength);
        } else {
          // For smaller objects, use pretty print
          const preview = JSON.stringify(result.parsed, null, 2).substring(
            0,
            maxLength
          );
          return preview + (preview.length < value.length ? "..." : "");
        }
      } catch (e) {
        // Fallback if any error during formatting
        return (
          value.substring(0, maxLength) +
          (value.length > maxLength ? "..." : "")
        );
      }
    } else {
      // Not valid JSON, just return truncated string
      return (
        value.substring(0, maxLength) + (value.length > maxLength ? "..." : "")
      );
    }
  },

  // Create a preview without full stringification for large objects
  createFastPreview(parsed: any, maxLength: number): string {
    if (Array.isArray(parsed)) {
      // For arrays, just show first few items
      const items = parsed.slice(0, 3).map((item) => {
        if (typeof item === "object" && item !== null) {
          return typeof item === "object"
            ? Array.isArray(item)
              ? "[...]"
              : "{...}"
            : String(item);
        }
        return String(item);
      });

      return `[${items.join(", ")}${parsed.length > 3 ? ", ..." : ""}]`;
    } else if (typeof parsed === "object" && parsed !== null) {
      // For objects, show first few properties
      const keys = Object.keys(parsed).slice(0, 3);
      const parts = keys.map((key) => {
        const val = parsed[key];
        const valStr =
          typeof val === "object" && val !== null
            ? Array.isArray(val)
              ? "[...]"
              : "{...}"
            : String(val).substring(0, 15);
        return `"${key}": ${valStr}`;
      });

      return `{${parts.join(", ")}${Object.keys(parsed).length > 3 ? ", ..." : ""}}`;
    }

    // Fallback for primitive values
    return String(parsed);
  },
};

// Updated JSON input component with optimized handling
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
    }
  } catch (e) {
    decodedValue = value;
  }

  const previewContainer = document.createElement("div");
  previewContainer.className =
    "json-preview p-1.5 border border-gray-300 rounded cursor-pointer hover:border-green-500 bg-gray-50 min-h-[38px] flex items-center justify-between w-full overflow-hidden";

  const previewText = document.createElement("code");
  previewText.className =
    "text-xs text-gray-600 truncate block w-[90%] overflow-hidden text-ellipsis";

  // Use optimized JSON preview utility
  previewText.textContent = jsonUtils.createPreview(decodedValue);

  previewContainer.appendChild(previewText);

  const editIcon = createIcon("pencil", "Edit JSON");
  editIcon.className = "w-4 h-4 ml-2 text-gray-500 flex-shrink-0";
  previewContainer.appendChild(editIcon);

  container.appendChild(previewContainer);

  // Lazy initialization of textarea - only create when needed
  let textarea: HTMLTextAreaElement | null = null;
  let modalInitialized = false;
  let modal: {
    showModal: () => void;
    hideModal: () => void;
    cleanup: () => void;
  } | null = null;

  // Function to initialize the modal only when needed
  const initializeModal = () => {
    if (modalInitialized) return;

    textarea = document.createElement("textarea");
    textarea.className =
      "w-full min-h-32 h-64 max-h-full p-2 border border-gray-300 rounded focus:outline-none focus:border-green-500 font-mono text-sm";
    textarea.placeholder = "Enter valid JSON here...";

    // Create error message element
    const errorMsg = document.createElement("div");
    errorMsg.className = "text-red-600 text-xs mr-auto hidden";

    // Create modal with reusable component
    modal = createModal({
      title: `Edit ${paramKey}`,
      bodyContent: textarea,
      errorMsg: errorMsg,
      onSave: () => {
        if (!textarea) return;
        try {
          const newValue = textarea.value;

          // Use the JSON utility for validation
          const parseResult = jsonUtils.tryParse(newValue);
          if (!parseResult.valid) {
            throw new Error("Invalid JSON format");
          }

          onChange(newValue);

          // Update preview with the new value
          previewText.textContent = jsonUtils.createPreview(newValue);

          if (modal) modal.hideModal();
          errorMsg.classList.add("hidden");
        } catch (err) {
          errorMsg.textContent = "Invalid JSON: " + (err as Error).message;
          errorMsg.classList.remove("hidden");
          if (textarea) textarea.focus();
        }
      },
    });

    modalInitialized = true;
  };

  // Show modal when preview is clicked - lazy initialization
  previewContainer.onclick = () => {
    // Initialize modal on first click
    if (!modalInitialized) {
      initializeModal();
    }

    if (textarea && modal) {
      try {
        // For large JSON, use direct assignment instead of prettification
        if (decodedValue.length > 50000) {
          textarea.value = decodedValue;
        } else {
          // Try to prettify smaller JSON values
          const parseResult = jsonUtils.tryParse(decodedValue);
          if (parseResult.valid) {
            textarea.value = JSON.stringify(parseResult.parsed, null, 2);
          } else {
            textarea.value = decodedValue;
          }
        }

        modal.showModal();
        textarea.focus();
      } catch (e) {
        // Fallback to raw value if any error occurs
        if (textarea) {
          textarea.value = decodedValue;
          modal.showModal();
          textarea.focus();
        }
      }
    }
  };

  // Cleanup only when container is removed
  const observer = new MutationObserver((mutationsList, obs) => {
    for (const mutation of mutationsList) {
      if (mutation.removedNodes) {
        mutation.removedNodes.forEach((node) => {
          if (node === container) {
            if (modal) modal.cleanup();
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
  private searchTerm: string = "";
  private cachedUnfilteredFragment: DocumentFragment | null = null; // Cache for unfiltered view

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

    // Initialize Apply button text
    const applyBtn = document.getElementById("applyBtn");
    if (applyBtn) {
      applyBtn.textContent = "Apply";
    }

    // Hide any errors on startup
    this.hideError();
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
      "searchParams",
      "clearSearchBtn",
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
    this.hideError(); // Clear any previous errors
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
        this.showError("Failed to get current URL from tab");
      }
    } catch (error) {
      console.error("Error loading current URL:", error);
      this.showError(
        "Error loading current URL: " +
          (error instanceof Error ? error.message : String(error))
      );
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
      // Start with empty arrays
      this.currentParams = [];
      this.originalParams = [];

      // Parse URL directly instead of using URL object for very large URLs
      const url = new URL(this.originalUrl);
      const searchParams = url.searchParams;

      // Estimate parameter count for array pre-allocation if possible
      const estimatedCount = this.estimateParamCount(url.search);
      if (estimatedCount > 50) {
        // Pre-allocate array capacity for large parameter sets
        this.currentParams = new Array(estimatedCount);
        this.originalParams = new Array(estimatedCount);
      }

      // Use a more efficient approach to process parameters
      let index = 0;
      const processInBatches = searchParams.size > 100;

      if (processInBatches) {
        // Process parameters in batches for very large URLs
        this.processParamsInBatches(searchParams, 50);
      } else {
        // Standard processing for smaller URLs
        searchParams.forEach((value, key) => {
          if (key.trim()) {
            const param = {
              key,
              value,
              type: this.detectParamType(value),
            };
            this.currentParams[index] = param;
            this.originalParams[index] = { ...param };
            index++;
          }
        });

        // Compact arrays if needed
        if (index < this.currentParams.length) {
          this.currentParams = this.currentParams.slice(0, index);
          this.originalParams = this.originalParams.slice(0, index);
        }
      }

      this.renderParams();
      this.updateParamsCount();
    } catch (error) {
      console.error("Error parsing URL parameters:", error);
    }
  }

  // Process parameters in batches to avoid UI blocking
  private processParamsInBatches(
    searchParams: URLSearchParams,
    batchSize: number
  ) {
    let index = 0;
    let processedCount = 0;
    const paramEntries = Array.from(searchParams.entries());
    const totalCount = paramEntries.length;

    const processBatch = () => {
      const endIdx = Math.min(processedCount + batchSize, totalCount);

      for (let i = processedCount; i < endIdx; i++) {
        const [key, value] = paramEntries[i];
        if (key.trim()) {
          const param = {
            key,
            value,
            type: this.detectParamType(value),
          };
          this.currentParams[index] = param;
          this.originalParams[index] = { ...param };
          index++;
        }
      }

      processedCount = endIdx;

      if (processedCount < totalCount) {
        // Schedule next batch to allow UI updates
        setTimeout(processBatch, 0);
      } else {
        // All batches processed
        // Compact arrays if needed
        if (index < this.currentParams.length) {
          this.currentParams = this.currentParams.slice(0, index);
          this.originalParams = this.originalParams.slice(0, index);
        }

        // Update UI after all parameters are processed
        this.renderParams();
        this.updateParamsCount();
      }
    };

    // Start batch processing
    processBatch();
  }

  // Estimate parameter count for pre-allocation
  private estimateParamCount(searchStr: string): number {
    if (!searchStr || searchStr === "?") return 0;

    // Quick count by counting ampersands
    return (searchStr.match(/&/g) || []).length + 1;
  }

  private detectParamType(value: string): Param["type"] {
    // Empty or whitespace-only values default to string
    if (!value || value.trim() === "") {
      return "string";
    }

    // Try to decode URL-encoded values first
    let decodedValue = value;
    try {
      // Only decode if it contains URL-encoded characters
      if (value.includes("%")) {
        decodedValue = decodeURIComponent(value);
      }
    } catch (e) {
      // If decoding fails, use the original value
      decodedValue = value;
    }

    // Trim the value for accurate detection
    const trimmedValue = decodedValue.trim();

    // JSON detection (Object or Array)
    if (
      (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) ||
      (trimmedValue.startsWith("[") && trimmedValue.endsWith("]"))
    ) {
      try {
        // Attempt to parse to validate JSON structure
        JSON.parse(trimmedValue);
        return "json"; // It's valid JSON
      } catch (e) {
        // Parsing failed, treat as string
        return "string";
      }
    }

    // Boolean detection
    if (
      trimmedValue.toLowerCase() === "true" ||
      trimmedValue.toLowerCase() === "false"
    ) {
      return "boolean";
    }

    // Number detection - ensure it's a valid number format
    if (/^-?\d+(\.\d+)?$/.test(trimmedValue) && !isNaN(Number(trimmedValue))) {
      return "number";
    }

    // Date detection - try parsing with stricter validation
    if (this.isValidDate(trimmedValue)) {
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
          return "list";
        }
      }
    }

    // Default to string for anything else
    return "string";
  }

  // Supported date formats examples:
  // - ISO 8601: "2023-05-15", "2023-05-15T14:30:00Z"
  // - US format: "05/15/2023", "5/15/2023"
  // - European format: "15.05.2023", "15/05/2023"
  // - Month name: "May 15, 2023", "15 May 2023"
  // - Month abbreviation: "15-May-2023", "May-15-2023"
  // - Relative: "yesterday", "today", "tomorrow"
  // Not supported:
  // - Multiple words with spaces: "as as ss"
  // - ID formats: "KEY-123"
  // - General strings with letters not referring to months
  private isValidDate(dateString: string): boolean {
    // Skip strings that are clearly not dates
    // Skip strings with alphabetic characters except for month names
    if (
      /[a-zA-Z]/.test(dateString) &&
      !/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(dateString)
    ) {
      return false;
    }

    // Skip strings in the format like "KEY-123"
    if (/^[A-Z]+-\d+$/i.test(dateString)) {
      return false;
    }

    // Skip strings that are just multiple words with spaces
    if (/^\w+\s+\w+\s+\w+$/.test(dateString)) {
      return false;
    }

    // Continue with standard date validation
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

      // Get the table header
      const tableHeader = paramsTable.querySelector("thead");

      // Show/hide header based on params availability
      if (tableHeader) {
        if (this.currentParams.length === 0) {
          tableHeader.classList.add("hidden");
        } else {
          tableHeader.classList.remove("hidden");
        }
      }
    }

    // Update params count
    this.updateParamsCount();

    // If no search term and we have a valid cached fragment, use it
    if (!this.searchTerm && this.cachedUnfilteredFragment) {
      console.log("Using cached fragment");

      try {
        // Use a safer approach - manually clone and append each row
        // Get a list of all cached rows first
        const cachedRows = Array.from(this.cachedUnfilteredFragment.childNodes);
        console.log(`Found ${cachedRows.length} cached rows`);

        if (cachedRows.length > 0) {
          // Clear the current table body
          paramsBody.innerHTML = "";

          // Create a new temporary fragment for the cloned rows
          const tempFragment = document.createDocumentFragment();

          // Clone each row and add to the temporary fragment
          cachedRows.forEach((row) => {
            tempFragment.appendChild(row.cloneNode(true));
          });

          // Append the fragment to the DOM
          paramsBody.appendChild(tempFragment);
          console.log("Successfully restored from cache");
          return;
        } else {
          console.log("Cache exists but has no rows - rebuilding");
          this.cachedUnfilteredFragment = null;
        }
      } catch (error) {
        console.error("Error restoring from cache:", error);
        // Fall through to regular rendering on error
        this.cachedUnfilteredFragment = null;
      }
    } else {
      console.log(
        `Not using cache. Search: "${this.searchTerm}", Cache exists: ${this.cachedUnfilteredFragment !== null}`
      );
    }

    // Create a document fragment to build DOM changes in memory
    const fragment = document.createDocumentFragment();

    // Filter parameters based on search term
    const filteredParams = this.searchTerm
      ? this.currentParams.filter(
          (param) =>
            param.key.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            param.value.toLowerCase().includes(this.searchTerm.toLowerCase())
        )
      : this.currentParams;

    // Early return if no parameters
    if (filteredParams.length === 0) {
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 3;
      emptyCell.className = "p-4 text-center text-gray-500 italic";

      // Change message based on whether we're searching
      if (this.searchTerm && this.currentParams.length > 0) {
        emptyCell.textContent = `No parameters matching "${this.searchTerm}".`;
      } else {
        emptyCell.textContent = "No parameters. Add one below.";
      }

      emptyRow.appendChild(emptyCell);
      fragment.appendChild(emptyRow);
    } else {
      // Render each parameter
      filteredParams.forEach((param, index) => {
        try {
          const row = createParamRow({
            param,
            index: this.currentParams.indexOf(param),
            onKeyChange: this.updateParamKey.bind(this),
            onValueChange: this.updateParamValue.bind(this),
            onRemove: this.removeParam.bind(this),
          });
          fragment.appendChild(row);
        } catch (error) {
          console.error(`Error rendering parameter row ${index}:`, error);
        }
      });
    }

    // Clear the current table body
    paramsBody.innerHTML = "";

    // Append the fragment to the DOM (single reflow/repaint)
    paramsBody.appendChild(fragment);

    // Cache the unfiltered fragment for future use - ONLY DO THIS WHEN NOT SEARCHING
    if (!this.searchTerm && this.currentParams.length > 0) {
      console.log("Building new cache");

      // We need to create a proper deep clone including all rows
      // Instead of cloning the fragment (which might not capture all DOM elements properly),
      // let's create a new fragment with cloned rows
      const newFragment = document.createDocumentFragment();

      // Copy all the rows from the current table
      const rows = paramsBody.querySelectorAll("tr");
      if (rows.length > 0) {
        // Make sure we have the expected number of rows
        if (rows.length !== this.currentParams.length) {
          console.warn(
            `Row count mismatch: DOM has ${rows.length} rows but params array has ${this.currentParams.length} items. Cache may be incomplete.`
          );
        }

        // Clone each row and add it to the fragment
        rows.forEach((row) => {
          newFragment.appendChild(row.cloneNode(true));
        });

        // Validate the new fragment
        if (newFragment.childNodes.length === rows.length) {
          // Set the cache only after we've built it completely and validated it
          this.cachedUnfilteredFragment = newFragment;
          console.log(`Cache created with ${rows.length} rows`);
        } else {
          console.error(
            "Failed to create complete cache - fragment node count mismatch"
          );
        }
      } else {
        console.log("No rows to cache");
      }
    }
  }

  // Helper method to get a version identifier for the parameters state
  private getParamsVersion(): number {
    // Simple hash function to represent current params state
    return this.currentParams.length;
  }

  private updateParamValue(index: number, value: string) {
    this.hideError(); // Clear any errors when user makes changes
    if (index >= 0 && index < this.currentParams.length) {
      this.currentParams[index].value = value;
      // Debounce type detection to avoid excessive processing during typing
      this.debouncedUpdateParamType(index, value);
      // Invalidate cache when params change
      this.cachedUnfilteredFragment = null;
    }
  }

  // Debounced method to update parameter type
  private debouncedUpdateParamType = debounce(
    (index: number, value: string) => {
      if (index >= 0 && index < this.currentParams.length) {
        this.currentParams[index].type = this.detectParamType(value);
      }
    },
    300
  );

  private updateParamKey(index: number, key: string) {
    this.hideError(); // Clear any errors when user makes changes
    if (index >= 0 && index < this.currentParams.length) {
      this.currentParams[index].key = key;
      // Invalidate cache when params change
      this.cachedUnfilteredFragment = null;
    }
  }

  private removeParam(index: number) {
    if (index >= 0 && index < this.currentParams.length) {
      this.currentParams.splice(index, 1);
      // Invalidate cache when params change
      this.cachedUnfilteredFragment = null;
      this.renderParams();
    }
  }

  private updateParamsCount() {
    const paramsCount = document.getElementById("paramsCount");
    if (paramsCount) {
      if (this.searchTerm) {
        // When filtering, show filtered/total count
        const filteredCount = this.currentParams.filter(
          (param) =>
            param.key.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            param.value.toLowerCase().includes(this.searchTerm.toLowerCase())
        ).length;
        paramsCount.textContent = `${filteredCount}/${this.currentParams.length}`;
      } else {
        // Normal count when not filtering
        paramsCount.textContent = this.currentParams.length.toString();
      }
    }
  }

  private showKeyboardShortcuts() {
    const popover = document.getElementById("keyboardShortcutsPopover");
    const button = document.getElementById("keyboardShortcutsBtn");

    if (!popover || !button) return;

    // Toggle the popover
    const isVisible = !popover.classList.contains("hidden");

    if (isVisible) {
      popover.classList.add("hidden");
      if (this.handleClickOutside) {
        document.removeEventListener("click", this.handleClickOutside);
      }
    } else {
      // Hide any existing popover
      popover.classList.remove("hidden");

      // Position the popover
      const buttonRect = button.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();

      // Add click outside handler
      this.handleClickOutside = (e: MouseEvent) => {
        if (
          !popover.contains(e.target as Node) &&
          !(e.target as Element).closest("#keyboardShortcutsBtn")
        ) {
          popover.classList.add("hidden");
          document.removeEventListener("click", this.handleClickOutside!);
        }
      };

      // Delay adding the click listener to avoid immediate closure
      setTimeout(() => {
        if (this.handleClickOutside) {
          document.addEventListener("click", this.handleClickOutside);
        }
      }, 0);
    }
  }

  private handleClickOutside: ((e: MouseEvent) => void) | null = null;

  private addNewParam() {
    this.hideError(); // Clear any errors when user makes changes
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

        // Invalidate cache when params change
        this.cachedUnfilteredFragment = null;
        this.renderParams();

        // Clear inputs
        keyInput.value = "";
        valueInput.value = "";
        keyInput.focus();
      } else {
        // Show error for empty key
        this.showError("Parameter key cannot be empty");
        keyInput.focus();
      }
    }
  }

  private showApplySpinner() {
    const applyBtn = document.getElementById("applyBtn");
    if (applyBtn) {
      // Clear any existing content
      applyBtn.innerHTML = "";

      // Create and add spinner
      const spinner = document.createElement("div");
      spinner.className =
        "inline-block w-4 h-4 border-2 border-gray-200 border-t-green-500 rounded-full animate-spin mr-1";

      // Create text span
      const textSpan = document.createElement("span");
      textSpan.textContent = "Applying...";

      // Add both to the button
      applyBtn.appendChild(spinner);
      applyBtn.appendChild(textSpan);

      // Disable button while spinner is showing
      applyBtn.setAttribute("disabled", "true");
      applyBtn.classList.add("opacity-75", "cursor-not-allowed");

      // Automatically hide spinner after 1 second
      setTimeout(() => this.hideApplySpinner(), 1000);
    }
  }

  private hideApplySpinner() {
    const applyBtn = document.getElementById("applyBtn");
    if (applyBtn) {
      // Reset button content
      applyBtn.textContent = "Apply";

      // Re-enable button
      applyBtn.removeAttribute("disabled");
      applyBtn.classList.remove("opacity-75", "cursor-not-allowed");
    }
  }

  private async applyChanges() {
    // Clear any existing errors before starting
    this.hideError();

    // Show spinner for visual feedback
    this.showApplySpinner();

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
        this.showError(
          `Cannot apply changes: ${invalidParams.length} parameter(s) have empty keys`
        );
        this.hideApplySpinner();
        return;
      }

      // More efficient URL building for large parameter sets
      const url = new URL(this.originalUrl);

      // Clear all existing search parameters
      url.search = "";

      // Build parameters string directly for very large parameter sets
      if (this.currentParams.length > 100) {
        // For very large parameter sets, build query string manually to avoid URLSearchParams overhead
        const paramParts: string[] = [];
        for (const param of this.currentParams) {
          if (param.key.trim()) {
            paramParts.push(
              `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`
            );
          }
        }

        url.search = paramParts.length > 0 ? "?" + paramParts.join("&") : "";
      } else {
        // Use URLSearchParams for normal sized parameter sets
        const searchParams = new URLSearchParams();

        // Add each parameter, with proper encoding
        this.currentParams.forEach((param) => {
          if (param.key.trim()) {
            searchParams.append(param.key, param.value);
          }
        });

        // Set the search part of the URL
        const paramString = searchParams.toString();
        if (paramString) {
          url.search = "?" + paramString;
        }
      }

      const newUrl = url.toString();

      // Create a timeout to handle cases where the background script doesn't respond
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              "Timeout: No response from background script after 5 seconds"
            )
          );
        }, 5000);
      });

      // Send message to background script to update URL
      const messagePromise = new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "UPDATE_URL",
            url: newUrl,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(
                new Error(`Chrome error: ${chrome.runtime.lastError.message}`)
              );
              return;
            }

            if (!response) {
              reject(new Error("No response from background script"));
              return;
            }

            if (response.error) {
              reject(new Error(response.error));
              return;
            }

            // Update local state on success
            this.originalUrl = newUrl;
            this.updateUrlDisplay();
            this.originalParams = this.currentParams.map((param) => ({
              ...param,
            }));
            // Invalidate cache when params are committed
            this.cachedUnfilteredFragment = null;
            this.updateParamsCount();
            resolve();
          }
        );
      });

      // Race the message promise against the timeout
      await Promise.race([messagePromise, timeoutPromise]);
      this.hideApplySpinner();
    } catch (error) {
      console.error("Error applying changes:", error);
      this.showError(
        error instanceof Error ? error.message : "Failed to apply changes"
      );
      this.hideApplySpinner();
    }
  }

  private resetChanges() {
    this.hideError(); // Clear any errors when resetting
    this.currentParams = [...this.originalParams];
    // Invalidate cache when params change
    this.cachedUnfilteredFragment = null;
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

    // Add keyboard shortcuts button click handler
    this.attachEventListener("keyboardShortcutsBtn", "click", () => {
      this.showKeyboardShortcuts();
    });

    // Add event listener for search input
    const searchInput = document.getElementById(
      "searchParams"
    ) as HTMLInputElement;
    if (searchInput) {
      // Use input event with debounce for real-time filtering
      const debouncedSearch = debounce((e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        this.handleSearch(value);
      }, 150);

      searchInput.addEventListener("input", debouncedSearch);

      // Also handle Enter key for immediate search
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleSearch((e.target as HTMLInputElement).value);
        }
      });
    }

    // Add event listener for clear search button
    this.attachEventListener("clearSearchBtn", "click", () => {
      this.clearSearch();
    });

    // Add event listeners to clear errors when user interacts with inputs
    const keyInput = document.getElementById("newParamKey");
    const valueInput = document.getElementById("newParamValue");

    if (keyInput) {
      keyInput.addEventListener("input", () => this.hideError());
      // Add Ctrl/CMD + Enter handler for key input
      keyInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          this.applyChanges();
        }
      });
    }

    if (valueInput) {
      valueInput.addEventListener("input", () => this.hideError());
      // Add Ctrl/CMD + Enter handler for value input
      valueInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          this.applyChanges();
        }
      });
    }

    // Add global keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Ctrl/CMD + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        const searchInput = document.getElementById(
          "searchParams"
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // Ctrl/CMD + N to focus new key input
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        const keyInput = document.getElementById(
          "newParamKey"
        ) as HTMLInputElement;
        if (keyInput) {
          keyInput.focus();
        }
      }

      // Ctrl/CMD + S to apply changes
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        this.applyChanges();
      }

      // Ctrl/CMD + Z to reset changes
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        this.resetChanges();
      }

      // Ctrl/CMD + C to copy parameter
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        const activeElement = document.activeElement;
        if (!activeElement) return;

        const currentRow = activeElement.closest("tr");
        if (!currentRow || !currentRow.parentElement?.id.includes("paramsBody"))
          return;

        const rows = Array.from(document.querySelectorAll("#paramsBody tr"));
        const currentIndex = rows.indexOf(currentRow);
        if (currentIndex === -1) return;

        const param = this.currentParams[currentIndex];
        if (!param) return;

        let copyText: string | undefined;
        const keyInput = currentRow.querySelector("input");

        if (activeElement === keyInput) {
          copyText = `${param.key}=${param.value}`;
        } else {
          const valueCell = currentRow.querySelectorAll("td")[1];
          if (valueCell && valueCell.contains(activeElement)) {
            copyText = param.value;
          }
        }

        if (copyText !== undefined) {
          e.preventDefault();
          navigator.clipboard.writeText(copyText).catch((err) => {
            console.error("Failed to copy text: ", err);
          });
        }
      }

      // Ctrl/CMD + Up/Down to navigate between parameters
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "ArrowUp" || e.key === "ArrowDown")
      ) {
        e.preventDefault();

        // Get all parameter rows
        const rows = document.querySelectorAll("#paramsBody tr");
        if (rows.length === 0) return;

        // Find currently focused input
        const activeElement = document.activeElement;
        if (!activeElement) return;

        // Find the current row
        const currentRow = activeElement.closest("tr");
        if (!currentRow) return;

        // Get current row index
        const currentIndex = Array.from(rows).indexOf(currentRow);
        if (currentIndex === -1) return;

        // Calculate new index
        let newIndex = currentIndex;
        if (e.key === "ArrowUp") {
          newIndex = Math.max(0, currentIndex - 1);
        } else {
          newIndex = Math.min(rows.length - 1, currentIndex + 1);
        }

        // Find input in the new row to focus
        const newRow = rows[newIndex];
        const inputToFocus = newRow.querySelector("input");
        if (inputToFocus) {
          inputToFocus.focus();
          // Select the text if it's a text input
          if (inputToFocus instanceof HTMLInputElement) {
            inputToFocus.select();
          }
        }
      }
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

  // Function to show an error message to the user
  private showError(message: string): void {
    const errorContainer = document.getElementById("errorContainer");
    const errorMessage = document.getElementById("errorMessage");

    if (errorContainer && errorMessage) {
      errorMessage.textContent = message;
      errorContainer.classList.remove("hidden");
      // Scroll into view if needed
      errorContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else {
      // Fallback to console if error elements don't exist
      console.error("Error:", message);
    }
  }

  // Function to hide error message
  private hideError(): void {
    const errorContainer = document.getElementById("errorContainer");
    if (errorContainer) {
      errorContainer.classList.add("hidden");
    }
  }

  // Add a method to handle the search functionality
  private handleSearch(searchText: string) {
    const oldSearchTerm = this.searchTerm;
    this.searchTerm = searchText.trim();

    console.log(
      `Search changed from "${oldSearchTerm}" to "${this.searchTerm}"`
    );
    console.log(`Cache exists: ${this.cachedUnfilteredFragment !== null}`);

    // Show/hide clear button based on search term
    const clearBtn = document.getElementById("clearSearchBtn");
    if (clearBtn) {
      if (this.searchTerm) {
        clearBtn.classList.remove("hidden");
      } else {
        clearBtn.classList.add("hidden");
      }
    }

    // Re-render the parameters to apply filter
    this.renderParams();
  }

  // Add a method to clear the search
  private clearSearch() {
    console.log("Clear search called");
    const searchInput = document.getElementById(
      "searchParams"
    ) as HTMLInputElement;

    if (searchInput) {
      // First set the input value to empty
      searchInput.value = "";

      // Then call handleSearch with empty string
      // This should trigger the cache restoration if available
      console.log("Calling handleSearch with empty string");
      this.handleSearch("");

      // Focus the search input after clearing
      searchInput.focus();
    }
  }

  public focusValueInput(index: number): void {
    const rows = document.querySelectorAll("#paramsBody tr");
    if (index >= 0 && index < rows.length) {
      const row = rows[index];
      // The value input is in the second 'td'.
      const valueCell = row.querySelectorAll("td")[1];
      if (valueCell) {
        const valueInput = valueCell.querySelector("input");
        if (valueInput instanceof HTMLInputElement) {
          valueInput.focus();
          valueInput.select();
        }
      }
    }
  }
}

// Initialize the editor when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");
  new ParamsEditor();
});
