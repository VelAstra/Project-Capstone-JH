/* Interactive PDF Editor Module - PDF Suite Pro */

let activeElements = []; // { id, pageIndex, type, x, y, width, height, text, color, fontSize, dataUrl }
let selectedElementId = null;

let currentOverlay = null;
let currentCanvasWidth = 0;
let currentCanvasHeight = 0;
let currentPageIndex = 0;

let isDragging = false;
let isResizing = false;
let activeDomElement = null;

let startX, startY;
let startLeft, startTop, startWidth, startHeight;

function initEditor(overlayContainer, pageIndex, canvasWidth, canvasHeight) {
  currentOverlay = overlayContainer;
  currentPageIndex = pageIndex;
  currentCanvasWidth = canvasWidth;
  currentCanvasHeight = canvasHeight;
  
  // Render existing elements for this page
  currentOverlay.innerHTML = '';
  activeElements.filter(e => e.pageIndex === pageIndex).forEach(el => {
    renderElement(el);
  });

  // Global mouse handlers for drag & resize
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Click on background to deselect
  currentOverlay.addEventListener('mousedown', (e) => {
    if (e.target === currentOverlay) {
      deselectAll();
    }
  });
}

function teardownEditor() {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  currentOverlay = null;
}

function addTextElement() {
  const el = {
    id: 'el_' + Date.now(),
    pageIndex: currentPageIndex,
    type: 'text',
    x: 50,
    y: 50,
    width: 200,
    height: 40,
    text: 'Double click to edit text',
    color: '#000000',
    fontSize: 16
  };
  activeElements.push(el);
  renderElement(el);
  selectElement(el.id);
  updateStatus();
}

function addImageElement(dataUrl) {
  // We need initial dimensions, roughly estimate or use a standard default box
  const el = {
    id: 'el_' + Date.now(),
    pageIndex: currentPageIndex,
    type: 'image',
    x: 50,
    y: 50,
    width: 150,
    height: 150,
    dataUrl: dataUrl
  };
  activeElements.push(el);
  renderElement(el);
  selectElement(el.id);
  updateStatus();
}

function deleteSelectedElement() {
  if (!selectedElementId) return;
  const domEl = document.getElementById(selectedElementId);
  if (domEl) domEl.remove();
  
  activeElements = activeElements.filter(e => e.id !== selectedElementId);
  selectedElementId = null;
  updatePropsPanel(null);
  updateStatus();
}

function updateSelectedTextProps(color, size) {
  if (!selectedElementId) return;
  const data = activeElements.find(e => e.id === selectedElementId);
  if (data && data.type === 'text') {
    data.color = color;
    data.fontSize = size;
    
    const domEl = document.getElementById(selectedElementId);
    if (domEl) {
      domEl.style.color = color;
      domEl.style.fontSize = `${size}px`;
    }
  }
}

function getAllEdits() {
  return activeElements;
}

function clearAllEdits() {
  activeElements = [];
  selectedElementId = null;
  if (currentOverlay) currentOverlay.innerHTML = '';
  updatePropsPanel(null);
  updateStatus();
}

/* Internal Rendering & Interaction */

function renderElement(elData) {
  if (!currentOverlay) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'editor-element';
  wrapper.id = elData.id;
  wrapper.style.left = `${elData.x}px`;
  wrapper.style.top = `${elData.y}px`;
  wrapper.style.width = `${elData.width}px`;
  wrapper.style.height = `${elData.height}px`;

  if (elData.type === 'text') {
    const textNode = document.createElement('div');
    textNode.className = 'editor-text';
    textNode.contentEditable = "false";
    textNode.innerText = elData.text;
    textNode.style.color = elData.color;
    textNode.style.fontSize = `${elData.fontSize}px`;
    wrapper.appendChild(textNode);

    // Double click to edit inline
    wrapper.addEventListener('dblclick', () => {
      textNode.contentEditable = "true";
      textNode.focus();
      
      // Select all text natively
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    textNode.addEventListener('blur', () => {
      textNode.contentEditable = "false";
      elData.text = textNode.innerText;
    });
    
    // Stop drag when typing
    textNode.addEventListener('mousedown', (e) => {
      if (textNode.contentEditable === "true") {
        e.stopPropagation();
      }
    });

  } else if (elData.type === 'image') {
    const imgNode = document.createElement('img');
    imgNode.className = 'editor-image';
    imgNode.src = elData.dataUrl;
    wrapper.appendChild(imgNode);
  }

  // Resize handle
  const handle = document.createElement('div');
  handle.className = 'editor-resize-handle';
  wrapper.appendChild(handle);

  // Interaction events
  wrapper.addEventListener('mousedown', (e) => {
    if (e.target === handle) {
      isResizing = true;
      activeDomElement = wrapper;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = wrapper.offsetWidth;
      startHeight = wrapper.offsetHeight;
    } else {
      isDragging = true;
      activeDomElement = wrapper;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(wrapper.style.left, 10) || 0;
      startTop = parseInt(wrapper.style.top, 10) || 0;
      selectElement(elData.id);
    }
    e.preventDefault();
    e.stopPropagation();
  });

  currentOverlay.appendChild(wrapper);
}

function onMouseMove(e) {
  if (!activeDomElement) return;

  if (isDragging) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newLeft = startLeft + dx;
    let newTop = startTop + dy;

    // Bounds checking
    newLeft = Math.max(0, Math.min(currentCanvasWidth - activeDomElement.offsetWidth, newLeft));
    newTop = Math.max(0, Math.min(currentCanvasHeight - activeDomElement.offsetHeight, newTop));

    activeDomElement.style.left = `${newLeft}px`;
    activeDomElement.style.top = `${newTop}px`;
  }

  if (isResizing) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    let newWidth = startWidth + dx;
    let newHeight = startHeight + dy;

    newWidth = Math.max(20, Math.min(currentCanvasWidth - parseInt(activeDomElement.style.left, 10), newWidth));
    newHeight = Math.max(20, Math.min(currentCanvasHeight - parseInt(activeDomElement.style.top, 10), newHeight));

    activeDomElement.style.width = `${newWidth}px`;
    activeDomElement.style.height = `${newHeight}px`;
  }
}

function onMouseUp() {
  if (isDragging || isResizing) {
    // Save state back to object
    const elData = activeElements.find(e => e.id === activeDomElement.id);
    if (elData) {
      elData.x = parseInt(activeDomElement.style.left, 10);
      elData.y = parseInt(activeDomElement.style.top, 10);
      elData.width = parseInt(activeDomElement.style.width, 10);
      elData.height = parseInt(activeDomElement.style.height, 10);
    }
  }
  isDragging = false;
  isResizing = false;
  activeDomElement = null;
}

function selectElement(id) {
  document.querySelectorAll('.editor-element').forEach(el => el.classList.remove('selected'));
  const domEl = document.getElementById(id);
  if (domEl) {
    domEl.classList.add('selected');
  }
  selectedElementId = id;
  
  const elData = activeElements.find(e => e.id === id);
  updatePropsPanel(elData);
}

function deselectAll() {
  document.querySelectorAll('.editor-element').forEach(el => el.classList.remove('selected'));
  selectedElementId = null;
  updatePropsPanel(null);
}

function updatePropsPanel(elData) {
  const panel = document.getElementById('edit-props-panel');
  const textProps = document.getElementById('edit-text-props');
  const colorInput = document.getElementById('edit-text-color');
  const sizeInput = document.getElementById('edit-text-size');
  
  if (!panel) return;

  if (!elData) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = 'block';
  
  if (elData.type === 'text') {
    textProps.style.display = 'flex';
    colorInput.value = elData.color;
    sizeInput.value = elData.fontSize;
  } else {
    textProps.style.display = 'none';
  }
}

function updateStatus() {
  const status = document.getElementById('edit-status');
  if (status) {
    const count = activeElements.length;
    status.textContent = count === 0 ? "No elements added yet." : `${count} element(s) added to document.`;
  }
}

window.pdfEditor = { initEditor, teardownEditor, addTextElement, addImageElement, deleteSelectedElement, updateSelectedTextProps, getAllEdits, clearAllEdits };

