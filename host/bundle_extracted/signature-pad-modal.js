/* Visual Signature Drawer and Placement Component - OmniPDF Studio */

let signaturePad = null;
let currentSignatureImage = null; // DataURL of signature
let activeMode = 'draw'; // 'draw' | 'type'
let chosenFont = 'cursive-1';

// Active signature placement state
let placementState = {
  x: 50,
  y: 50,
  width: 150,
  height: 75,
  pageIndex: 0
};

/**
 * Initialize Signature Pad components and events
 */
function initSignaturePad() {
  const canvas = document.getElementById('signature-canvas');
  if (!canvas) return;

  // Initialize signature pad library
  signaturePad = new window.SignaturePad(canvas, {
    backgroundColor: 'rgba(255, 255, 255, 0)',
    penColor: '#000000'
  });

  // Setup canvas size adjustments
  adjustCanvasSize(canvas);

  // Pad Clear
  document.getElementById('btn-clear-pad').addEventListener('click', () => {
    signaturePad.clear();
  });

  // Color Selection
  const colorDots = document.querySelectorAll('.color-dot');
  colorDots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      colorDots.forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const color = dot.getAttribute('data-color');
      signaturePad.penColor = color;
    });
  });

  // Type signature input
  const typeInput = document.getElementById('typed-signature-input');
  const previews = document.querySelectorAll('.font-preview');
  
  typeInput.addEventListener('input', () => {
    const text = typeInput.value.trim() || 'Signature Preview';
    previews.forEach(p => {
      p.textContent = text;
    });
  });

  // Mode select logic
  typeInput.addEventListener('focus', () => {
    activeMode = 'type';
  });
  canvas.addEventListener('mousedown', () => {
    activeMode = 'draw';
  });
  canvas.addEventListener('touchstart', () => {
    activeMode = 'draw';
  });

  // Font Selection
  previews.forEach(preview => {
    preview.addEventListener('click', () => {
      previews.forEach(p => p.classList.remove('active'));
      preview.classList.add('active');
      chosenFont = preview.getAttribute('data-font');
      activeMode = 'type';
    });
  });
}

function adjustCanvasSize(canvas) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = canvas.offsetWidth * ratio;
  canvas.height = canvas.offsetHeight * ratio;
  canvas.getContext("2d").scale(ratio, ratio);
  if (signaturePad) signaturePad.clear();
}

/**
 * Generate a transparent PNG data URL of the signature based on mode
 * @returns {string|null}
 */
function getSignatureImage() {
  if (activeMode === 'draw') {
    if (signaturePad.isEmpty()) return null;
    return signaturePad.toDataURL('image/png');
  } else {
    // Render text to canvas and return image
    const textInput = document.getElementById('typed-signature-input');
    const text = textInput.value.trim();
    if (!text) return null;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 400;
    tempCanvas.height = 150;
    const ctx = tempCanvas.getContext('2d');
    
    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Choose font family based on settings
    let fontName = 'cursive';
    if (chosenFont === 'cursive-1') fontName = "'Caveat', cursive";
    if (chosenFont === 'cursive-2') fontName = "'Great Vibes', cursive";
    
    // Set active color from drawing pad selection
    const activeColor = signaturePad.penColor || '#000000';
    
    ctx.font = `italic 44px ${fontName}`;
    ctx.fillStyle = activeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);
    
    return tempCanvas.toDataURL('image/png');
  }
}

/**
 * Setup draggable placement UI on the PDF preview page
 * @param {HTMLDivElement} container 
 * @param {string} signatureDataUrl 
 * @param {number} canvasWidth 
 * @param {number} canvasHeight 
 * @param {function} onConfirm 
 */
function setupDraggableSignature(container, signatureDataUrl, canvasWidth, canvasHeight, onConfirm) {
  // Clear any existing draggables
  const existing = container.querySelector('.draggable-signature');
  if (existing) existing.remove();

  // Create stamp container
  const stamp = document.createElement('div');
  stamp.className = 'draggable-signature';
  stamp.style.width = '150px';
  stamp.style.height = '75px';
  stamp.style.left = '50px';
  stamp.style.top = '50px';

  const img = document.createElement('img');
  img.src = signatureDataUrl;
  stamp.appendChild(img);

  // Resize handle
  const handle = document.createElement('div');
  handle.className = 'sig-resize-handle';
  stamp.appendChild(handle);

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.className = 'sig-delete-btn';
  delBtn.innerHTML = '&times;';
  stamp.appendChild(delBtn);

  container.appendChild(stamp);

  // Drag and drop state
  let isDragging = false;
  let isResizing = false;
  let startX, startY;
  let startLeft, startTop;
  let startWidth, startHeight;

  // Mouse/Touch events for Dragging
  stamp.addEventListener('mousedown', (e) => {
    if (e.target === handle || e.target === delBtn) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(stamp.style.left, 10) || 0;
    startTop = parseInt(stamp.style.top, 10) || 0;
    e.preventDefault();
  });

  // Mouse/Touch events for Resizing
  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = stamp.offsetWidth;
    startHeight = stamp.offsetHeight;
    e.preventDefault();
    e.stopPropagation();
  });

  // Global mouse move
  const onMouseMove = (e) => {
    if (isDragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = startLeft + dx;
      let newTop = startTop + dy;

      // Bound checking
      newLeft = Math.max(0, Math.min(canvasWidth - stamp.offsetWidth, newLeft));
      newTop = Math.max(0, Math.min(canvasHeight - stamp.offsetHeight, newTop));

      stamp.style.left = `${newLeft}px`;
      stamp.style.top = `${newTop}px`;
      
      placementState.x = newLeft;
      placementState.y = newTop;
    }

    if (isResizing) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newWidth = startWidth + dx;
      let newHeight = startHeight + dy;

      // Maintain aspect ratio or set limits
      newWidth = Math.max(40, Math.min(canvasWidth - parseInt(stamp.style.left, 10), newWidth));
      newHeight = Math.max(20, Math.min(canvasHeight - parseInt(stamp.style.top, 10), newHeight));

      stamp.style.width = `${newWidth}px`;
      stamp.style.height = `${newHeight}px`;

      placementState.width = newWidth;
      placementState.height = newHeight;
    }
  };

  const onMouseUp = () => {
    isDragging = false;
    isResizing = false;
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Delete button click
  delBtn.addEventListener('click', () => {
    stamp.remove();
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    onConfirm(null); // Signal deletion
  });
}

/**
 * Translate HTML Canvas placement to PDF coordinates
 * PDF coordinates start from Bottom-Left!
 * @param {number} pdfWidth 
 * @param {number} pdfHeight 
 * @param {number} canvasWidth 
 * @param {number} canvasHeight 
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function getPdfCoordinates(pdfWidth, pdfHeight, canvasWidth, canvasHeight) {
  const scaleX = pdfWidth / canvasWidth;
  const scaleY = pdfHeight / canvasHeight;

  const width = placementState.width * scaleX;
  const height = placementState.height * scaleY;
  
  // X translation
  const x = placementState.x * scaleX;
  
  // Y translation (Flip vertically because canvas origin is Top-Left and PDF is Bottom-Left)
  const canvasYflipped = canvasHeight - placementState.y - placementState.height;
  const y = canvasYflipped * scaleY;

  return { x, y, width, height };
}

window.sigPad = { initSignaturePad, getSignatureImage, setupDraggableSignature, getPdfCoordinates };

