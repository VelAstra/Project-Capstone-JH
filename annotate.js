/* =========================================================
   Annotate Module – OmniPDF Studio
   Supports: highlight, sticky note, rectangle, free-draw
   Annotations are stored per-page and burned into the PDF
   on export via pdf-lib.
   ========================================================= */

'use strict';

// ----------- State ------------------------------------------
let _annotations    = [];   // { id, pageIndex, type, x, y, w, h, color, opacity, strokeWidth, text, points }
let _currentPage    = 0;
let _overlay        = null; // The SVG/div overlay element
let _canvasWidth    = 0;
let _canvasHeight   = 0;

// Drawing state
let _isDrawing      = false;
let _drawStart      = null;
let _currentSvgEl   = null;
let _freePath       = [];

// ----------- Public API -------------------------------------

function initAnnotator(overlayEl, pageIndex, canvasWidth, canvasHeight) {
  _overlay      = overlayEl;
  _currentPage  = pageIndex;
  _canvasWidth  = canvasWidth;
  _canvasHeight = canvasHeight;

  _overlay.innerHTML = '';
  _overlay.style.cursor = _getCursor();

  // Re-render existing annotations for this page
  _annotations
    .filter(a => a.pageIndex === pageIndex)
    .forEach(a => _renderAnnotation(a));

  // Mouse/pointer events
  _overlay.addEventListener('mousedown', _onMouseDown);
  document.addEventListener('mousemove', _onMouseMove);
  document.addEventListener('mouseup',   _onMouseUp);
}

function teardownAnnotator() {
  if (!_overlay) return;
  _overlay.removeEventListener('mousedown', _onMouseDown);
  document.removeEventListener('mousemove', _onMouseMove);
  document.removeEventListener('mouseup',   _onMouseUp);
  _overlay = null;
}

function clearAnnotations() {
  _annotations = [];
  if (_overlay) _overlay.innerHTML = '';
  _updateStatus();
}

function getAllAnnotations() {
  return _annotations;
}

/**
 * Burn all annotations into a pdf-lib PDFDocument.
 * Returns the modified PDFDocument (caller should save it).
 */
async function burnAnnotationsIntoPdf(pdfDoc) {
  const pages = pdfDoc.getPages();

  for (const ann of _annotations) {
    const page = pages[ann.pageIndex];
    if (!page) continue;

    const { width: pgW, height: pgH } = page.getSize();

    // Scale annotation coords (from canvas pixels) → PDF points
    const scaleX = pgW / _canvasWidth;
    const scaleY = pgH / _canvasHeight;

    const [r, g, b] = _hexToRgb01(ann.color);
    const rgb = { r, g, b };

    if (ann.type === 'highlight') {
      // Draw a semi-transparent filled rectangle
      const x   = ann.x * scaleX;
      const y   = pgH - (ann.y + ann.h) * scaleY;
      const w   = ann.w * scaleX;
      const h   = ann.h * scaleY;
      page.drawRectangle({
        x, y, width: w, height: h,
        color: rgb,
        opacity: ann.opacity,
      });
    } else if (ann.type === 'rectangle') {
      const x   = ann.x * scaleX;
      const y   = pgH - (ann.y + ann.h) * scaleY;
      const w   = ann.w * scaleX;
      const h   = ann.h * scaleY;
      page.drawRectangle({
        x, y, width: w, height: h,
        borderColor: rgb,
        borderWidth: ann.strokeWidth,
        opacity: ann.opacity,
        color: { r: 0, g: 0, b: 0 },  // transparent fill trick
        borderOpacity: ann.opacity,
      });
    } else if (ann.type === 'freedraw') {
      if (!ann.points || ann.points.length < 2) continue;
      // Draw each segment as a line
      for (let i = 0; i < ann.points.length - 1; i++) {
        const p1 = ann.points[i];
        const p2 = ann.points[i + 1];
        page.drawLine({
          start: { x: p1.x * scaleX, y: pgH - p1.y * scaleY },
          end:   { x: p2.x * scaleX, y: pgH - p2.y * scaleY },
          thickness: ann.strokeWidth,
          color: rgb,
          opacity: ann.opacity,
        });
      }
    } else if (ann.type === 'sticky') {
      // Draw a yellow filled box with text
      const x   = ann.x * scaleX;
      const y   = pgH - (ann.y + 80) * scaleY;
      const noteH = 80 * scaleY;
      const noteW = 160 * scaleX;
      page.drawRectangle({
        x, y, width: noteW, height: noteH,
        color: { r: 1, g: 0.96, b: 0.4 },
        borderColor: { r: 0.8, g: 0.7, b: 0 },
        borderWidth: 1,
        opacity: 0.92,
      });
      try {
        const font = await pdfDoc.embedStandardFont('Helvetica');
        const wrapped = _wrapText(ann.text || '', 18, noteW - 8);
        let ty = y + noteH - 14;
        for (const line of wrapped) {
          page.drawText(line, {
            x: x + 4,
            y: ty,
            size: 10,
            font,
            color: { r: 0.1, g: 0.1, b: 0.1 },
          });
          ty -= 13;
          if (ty < y + 4) break;
        }
      } catch (_) {}
    }
  }
  return pdfDoc;
}

// ----------- Private helpers --------------------------------

function _getCursor() {
  const tool = _getTool();
  if (tool === 'freedraw') return 'crosshair';
  if (tool === 'sticky')   return 'cell';
  return 'crosshair';
}

function _getTool() {
  const checked = document.querySelector('input[name="annotate-tool"]:checked');
  return checked ? checked.value : 'highlight';
}

function _getColor()       { return (document.getElementById('annotate-color')?.value)        || '#FFFF00'; }
function _getOpacity()     { return parseFloat(document.getElementById('annotate-opacity')?.value  || '0.5'); }
function _getStrokeWidth() { return parseInt(document.getElementById('annotate-stroke-width')?.value || '3', 10); }
function _getNoteText()    { return (document.getElementById('annotate-note-text')?.value)     || ''; }

function _overlayRect() {
  return _overlay ? _overlay.getBoundingClientRect() : { left: 0, top: 0 };
}

function _clientToLocal(e) {
  const r = _overlayRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function _onMouseDown(e) {
  if (!_overlay) return;
  e.preventDefault();
  const pos  = _clientToLocal(e);
  const tool = _getTool();

  if (tool === 'sticky') {
    _placeStickyNote(pos);
    return;
  }

  _isDrawing = true;
  _drawStart = pos;

  if (tool === 'freedraw') {
    _freePath = [pos];
    _currentSvgEl = _createSvgEl('polyline', {
      points: `${pos.x},${pos.y}`,
      stroke: _getColor(),
      'stroke-width': _getStrokeWidth(),
      'stroke-opacity': _getOpacity(),
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    _overlay.appendChild(_currentSvgEl);
  } else if (tool === 'highlight' || tool === 'rectangle') {
    const fillOpacity = tool === 'highlight' ? _getOpacity() : 0;
    const strokeOpacity = tool === 'rectangle' ? _getOpacity() : 0;
    _currentSvgEl = _createSvgEl('rect', {
      x: pos.x, y: pos.y, width: 0, height: 0,
      fill: _getColor(),
      'fill-opacity': fillOpacity,
      stroke: _getColor(),
      'stroke-width': tool === 'rectangle' ? _getStrokeWidth() : 0,
      'stroke-opacity': strokeOpacity,
    });
    _overlay.appendChild(_currentSvgEl);
  }
}

function _onMouseMove(e) {
  if (!_isDrawing || !_currentSvgEl || !_overlay) return;
  const pos  = _clientToLocal(e);
  const tool = _getTool();

  if (tool === 'freedraw') {
    _freePath.push(pos);
    const pts = _freePath.map(p => `${p.x},${p.y}`).join(' ');
    _currentSvgEl.setAttribute('points', pts);
  } else {
    const x = Math.min(pos.x, _drawStart.x);
    const y = Math.min(pos.y, _drawStart.y);
    const w = Math.abs(pos.x - _drawStart.x);
    const h = Math.abs(pos.y - _drawStart.y);
    _currentSvgEl.setAttribute('x', x);
    _currentSvgEl.setAttribute('y', y);
    _currentSvgEl.setAttribute('width',  w);
    _currentSvgEl.setAttribute('height', h);
  }
}

function _onMouseUp(e) {
  if (!_isDrawing) return;
  _isDrawing = false;

  const pos  = _clientToLocal(e);
  const tool = _getTool();

  // Ignore accidental tiny drags
  if (tool !== 'freedraw') {
    const w = Math.abs(pos.x - _drawStart.x);
    const h = Math.abs(pos.y - _drawStart.y);
    if (w < 4 && h < 4) {
      if (_currentSvgEl) _currentSvgEl.remove();
      _currentSvgEl = null;
      return;
    }
  }

  // Persist the annotation object
  const id = 'ann_' + Date.now();
  const color = _getColor();
  const opacity = _getOpacity();
  const sw = _getStrokeWidth();

  if (tool === 'freedraw') {
    _annotations.push({
      id, pageIndex: _currentPage, type: 'freedraw',
      x: 0, y: 0, w: 0, h: 0,
      color, opacity, strokeWidth: sw,
      points: [..._freePath],
    });
    _freePath = [];
  } else {
    const x = Math.min(pos.x, _drawStart.x);
    const y = Math.min(pos.y, _drawStart.y);
    const w = Math.abs(pos.x - _drawStart.x);
    const h = Math.abs(pos.y - _drawStart.y);
    _annotations.push({
      id, pageIndex: _currentPage, type: tool,
      x, y, w, h, color, opacity, strokeWidth: sw,
    });
  }

  // Tag the SVG element with the annotation id for future removal
  if (_currentSvgEl) {
    _currentSvgEl.dataset.annId = id;
    _currentSvgEl = null;
  }

  _updateStatus();
}

function _placeStickyNote(pos) {
  const id    = 'ann_' + Date.now();
  const text  = _getNoteText() || 'Note';
  const color = _getColor();

  _annotations.push({
    id, pageIndex: _currentPage, type: 'sticky',
    x: pos.x, y: pos.y, w: 160, h: 80,
    color, opacity: 0.92, strokeWidth: 1,
    text,
  });

  // Render sticky DOM element
  const note = document.createElement('div');
  note.dataset.annId = id;
  note.style.cssText = `
    position: absolute;
    left: ${pos.x}px; top: ${pos.y}px;
    width: 160px; min-height: 80px;
    background: #FFEE66; border: 1.5px solid #CCAA00;
    border-radius: 4px; padding: 6px 8px;
    font-size: 12px; line-height: 1.4; color: #333;
    cursor: move; box-shadow: 2px 3px 8px rgba(0,0,0,0.25);
    white-space: pre-wrap; word-break: break-word;
    user-select: none;
    z-index: 5;
  `;
  note.textContent = text;
  _overlay.appendChild(note);

  // Drag support for sticky notes
  let dragging = false, ox = 0, oy = 0;
  note.addEventListener('mousedown', ev => {
    dragging = true; ox = ev.offsetX; oy = ev.offsetY;
    ev.stopPropagation();
  });
  document.addEventListener('mousemove', ev => {
    if (!dragging) return;
    const r = _overlayRect();
    const nx = ev.clientX - r.left - ox;
    const ny = ev.clientY - r.top  - oy;
    note.style.left = nx + 'px';
    note.style.top  = ny + 'px';
    const ann = _annotations.find(a => a.id === id);
    if (ann) { ann.x = nx; ann.y = ny; }
  });
  document.addEventListener('mouseup', () => { dragging = false; });

  _updateStatus();
}

function _renderAnnotation(ann) {
  if (ann.type === 'sticky') {
    _placeStickyNote({ x: ann.x, y: ann.y });
    // Remove the duplicate that _placeStickyNote just pushed
    _annotations.pop();
    return;
  }
  // SVG-based annotations
  let el;
  if (ann.type === 'freedraw') {
    const pts = ann.points.map(p => `${p.x},${p.y}`).join(' ');
    el = _createSvgEl('polyline', {
      points: pts,
      stroke: ann.color, 'stroke-width': ann.strokeWidth,
      'stroke-opacity': ann.opacity, fill: 'none',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
  } else if (ann.type === 'highlight') {
    el = _createSvgEl('rect', {
      x: ann.x, y: ann.y, width: ann.w, height: ann.h,
      fill: ann.color, 'fill-opacity': ann.opacity,
      stroke: 'none',
    });
  } else if (ann.type === 'rectangle') {
    el = _createSvgEl('rect', {
      x: ann.x, y: ann.y, width: ann.w, height: ann.h,
      fill: 'none', stroke: ann.color,
      'stroke-width': ann.strokeWidth,
      'stroke-opacity': ann.opacity,
    });
  }
  if (el) {
    el.dataset.annId = ann.id;
    _overlay.appendChild(el);
  }
}

function _createSvgEl(tag, attrs) {
  // Ensure SVG overlay exists inside _overlay
  let svgRoot = _overlay.querySelector('svg.ann-svg');
  if (!svgRoot) {
    svgRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgRoot.classList.add('ann-svg');
    svgRoot.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;';
    _overlay.insertBefore(svgRoot, _overlay.firstChild);
  }
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  svgRoot.appendChild(el);
  return el;
}

function _updateStatus() {
  const el = document.getElementById('annotate-status');
  if (!el) return;
  const cnt = _annotations.length;
  el.textContent = cnt === 0
    ? 'Load a PDF and click on the page to annotate.'
    : `${cnt} annotation(s) added.`;
}

function _hexToRgb01(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function _wrapText(text, charsPerLine) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > charsPerLine) {
      lines.push(current.trim());
      current = w;
    } else {
      current += ' ' + w;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

// ----------- Wire up config panel interactivity --------------
document.addEventListener('DOMContentLoaded', () => {
  // Show/hide note text field based on tool selection
  document.querySelectorAll('input[name="annotate-tool"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const noteGroup   = document.getElementById('annotate-note-group');
      const strokeGroup = document.getElementById('annotate-stroke-group');
      if (noteGroup)   noteGroup.style.display   = radio.value === 'sticky' ? 'block' : 'none';
      if (strokeGroup) strokeGroup.style.display = radio.value === 'highlight' ? 'none' : 'block';
      if (_overlay)    _overlay.style.cursor = _getCursor();
    });
  });

  document.getElementById('btn-annotate-clear')?.addEventListener('click', clearAnnotations);
});

// Export public surface
window.pdfAnnotator = {
  initAnnotator,
  teardownAnnotator,
  clearAnnotations,
  getAllAnnotations,
  burnAnnotationsIntoPdf,
};
