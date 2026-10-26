/*
 * Accessibility-preferences widget for the landing page (Regulation 35 / IS 5568).
 * Vanilla port of src/components/a11y/accessibility-widget.tsx + src/lib/a11y/core.ts
 * from the main app. Same preference schema and the SAME localStorage key, so a
 * visitor's settings carry over when the full app is served from the same origin.
 *
 * Scope fence: this is a user-preference comfort tool. It toggles CSS classes on
 * <html> and nothing else — it never edits page content, alt text or ARIA, and it is
 * not a compliance claim by itself (see a11y-widget.css for the effects).
 *
 * Loaded synchronously from <head>: the stored preferences are applied before first
 * paint (no flash), and the UI is built once the DOM is ready.
 */
(function () {
  'use strict';

  var KEY = 'countme_a11y_prefs_v1';
  var VERSION = 1;
  var DEFAULTS = { version: VERSION, links: false, contrast: 'off', textSize: 100, lineSpacing: 'normal', readableFont: false, reduceMotion: false };
  var CONTRAST = ['off', 'high', 'invert', 'mono'];
  var SIZES = [100, 115, 130, 150];
  var LINES = ['normal', '16', '20'];
  var CONTRAST_LABEL = { off: 'כבוי', high: 'מוגברת', invert: 'היפוך צבעים', mono: 'שחור-לבן' };
  var LINES_LABEL = { normal: 'רגיל', '16': 'מוגדל', '20': 'כפול' };

  // Single table drives both the runtime and the pre-paint apply below.
  var RULES = [
    ['a11y-links', function (p) { return p.links; }],
    ['a11y-contrast-high', function (p) { return p.contrast === 'high'; }],
    ['a11y-contrast-invert', function (p) { return p.contrast === 'invert'; }],
    ['a11y-contrast-mono', function (p) { return p.contrast === 'mono'; }],
    ['a11y-text-115', function (p) { return p.textSize === 115; }],
    ['a11y-text-130', function (p) { return p.textSize === 130; }],
    ['a11y-text-150', function (p) { return p.textSize === 150; }],
    ['a11y-lines-16', function (p) { return p.lineSpacing === '16'; }],
    ['a11y-lines-20', function (p) { return p.lineSpacing === '20'; }],
    ['a11y-readable-font', function (p) { return p.readableFont; }],
    ['a11y-reduce-motion', function (p) { return p.reduceMotion; }]
  ];

  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return copy(DEFAULTS);
      var p = JSON.parse(raw);
      if (!p || p.version !== VERSION) return copy(DEFAULTS);
      var r = copy(DEFAULTS);
      for (var k in DEFAULTS) if (p[k] !== undefined) r[k] = p[k];
      return r;
    } catch (e) { return copy(DEFAULTS); }
  }
  function write(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* private mode: in-memory only */ } }
  function apply(p) {
    var c = document.documentElement.classList;
    RULES.forEach(function (r) { c.toggle(r[0], !!r[1](p)); });
  }
  function isAnyActive(p) {
    return p.links || p.contrast !== 'off' || p.textSize !== 100 || p.lineSpacing !== 'normal' || p.readableFont || p.reduceMotion;
  }
  function next(list, v) { return list[(list.indexOf(v) + 1) % list.length]; }

  var prefs = read();
  apply(prefs); // before first paint

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  function build() {
    if (document.getElementById('a11y-widget-trigger')) return;

    var status = el('span', { id: 'a11y-widget-status', role: 'status', 'aria-live': 'polite', 'class': 'a11y-w-sr' });
    function announce(label, value) { status.textContent = value ? label + ': ' + value : label; }

    var trigger = el('button', {
      id: 'a11y-widget-trigger', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'a11y-widget-panel',
      'aria-keyshortcuts': 'Alt+A', 'aria-label': 'אפשרויות נגישות (Alt+A)', title: 'אפשרויות נגישות (Alt+A)'
    });
    trigger.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="4.5" r="1.6"></circle><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5l-3.2 5.5M12 14.5l3.2 5.5"></path></svg>';

    var panel = el('div', { id: 'a11y-widget-panel', role: 'dialog', 'aria-label': 'אפשרויות נגישות', tabindex: '-1', hidden: '' });
    var head = el('div', { 'class': 'a11y-w-head' });
    head.appendChild(el('h2', { 'class': 'a11y-w-title' }, 'אפשרויות נגישות'));
    var close = el('button', { type: 'button', 'class': 'a11y-w-close', 'aria-label': 'סגירת אפשרויות נגישות' }, '×');
    head.appendChild(close);
    panel.appendChild(head);

    var list = el('div', { 'class': 'a11y-w-list' });
    panel.appendChild(list);

    function row(label, valueText) {
      var b = el('button', { type: 'button', 'class': 'a11y-w-btn' });
      b.appendChild(el('span', null, label));
      if (valueText !== null) b.appendChild(el('span', { 'class': 'a11y-w-val' }));
      return b;
    }

    // Cycling toggles: no aria-pressed (more than two states) — the accessible name carries the value.
    var bContrast = row('ניגודיות', '');
    var bSize = row('גודל טקסט', '');
    var bLines = row('ריווח שורות', '');
    // Binary toggles: aria-pressed.
    var bLinks = row('הדגשת קישורים', null);
    var bFont = row('גופן קריא', null);
    var bMotion = row('עצירת אנימציות', null);
    var bReset = row('איפוס הגדרות', null);
    bReset.classList.add('a11y-w-reset');
    [bContrast, bSize, bLines, bLinks, bFont, bMotion, bReset].forEach(function (b) { list.appendChild(b); });

    var foot = el('p', { 'class': 'a11y-w-foot' });
    foot.appendChild(document.createTextNode('קיצור מקלדת: Alt+A · '));
    var stmt = el('button', { type: 'button', 'class': 'a11y-w-link' }, 'הצהרת נגישות');
    foot.appendChild(stmt);
    panel.appendChild(foot);

    function setVal(btn, text) { btn.querySelector('.a11y-w-val').textContent = text; }
    function render() {
      setVal(bContrast, CONTRAST_LABEL[prefs.contrast]);
      bContrast.setAttribute('aria-label', 'ניגודיות: ' + CONTRAST_LABEL[prefs.contrast]);
      bContrast.classList.toggle('on', prefs.contrast !== 'off');
      setVal(bSize, prefs.textSize + '%');
      bSize.setAttribute('aria-label', 'גודל טקסט: ' + prefs.textSize + '%');
      bSize.classList.toggle('on', prefs.textSize !== 100);
      setVal(bLines, LINES_LABEL[prefs.lineSpacing]);
      bLines.setAttribute('aria-label', 'ריווח שורות: ' + LINES_LABEL[prefs.lineSpacing]);
      bLines.classList.toggle('on', prefs.lineSpacing !== 'normal');
      [[bLinks, 'links'], [bFont, 'readableFont'], [bMotion, 'reduceMotion']].forEach(function (p) {
        p[0].setAttribute('aria-pressed', prefs[p[1]] ? 'true' : 'false');
        p[0].classList.toggle('on', !!prefs[p[1]]);
      });
      trigger.classList.toggle('on', isAnyActive(prefs));
    }
    function set(partial) {
      for (var k in partial) prefs[k] = partial[k];
      prefs.version = VERSION;
      write(prefs);
      apply(prefs);
      render();
    }

    bContrast.addEventListener('click', function () { var v = next(CONTRAST, prefs.contrast); set({ contrast: v }); announce('ניגודיות', CONTRAST_LABEL[v]); });
    bSize.addEventListener('click', function () { var v = next(SIZES, prefs.textSize); set({ textSize: v }); announce('גודל טקסט', v + '%'); });
    bLines.addEventListener('click', function () { var v = next(LINES, prefs.lineSpacing); set({ lineSpacing: v }); announce('ריווח שורות', LINES_LABEL[v]); });
    bLinks.addEventListener('click', function () { var v = !prefs.links; set({ links: v }); announce('הדגשת קישורים', v ? 'פעיל' : 'כבוי'); });
    bFont.addEventListener('click', function () { var v = !prefs.readableFont; set({ readableFont: v }); announce('גופן קריא', v ? 'פעיל' : 'כבוי'); });
    bMotion.addEventListener('click', function () { var v = !prefs.reduceMotion; set({ reduceMotion: v }); announce('עצירת אנימציות', v ? 'פעיל' : 'כבוי'); });
    bReset.addEventListener('click', function () {
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      prefs = copy(DEFAULTS);
      apply(prefs);
      render();
      announce('הגדרות הנגישות אופסו');
    });

    function setOpen(open, returnFocus) {
      if (open) { panel.removeAttribute('hidden'); } else { panel.setAttribute('hidden', ''); }
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) panel.focus();
      else if (returnFocus) trigger.focus();
    }
    trigger.addEventListener('click', function () { setOpen(panel.hasAttribute('hidden'), false); });
    close.addEventListener('click', function () { setOpen(false, true); });
    stmt.addEventListener('click', function () {
      // The statement is part of the page: open it (footer toggle) and move there.
      var toggle = document.querySelector('[aria-controls="a11y"]');
      if (toggle && toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
      setOpen(false, false);
      setTimeout(function () {
        var s = document.getElementById('a11y');
        if (s) { s.setAttribute('tabindex', '-1'); s.scrollIntoView({ block: 'start' }); s.focus({ preventScroll: true }); }
      }, 60);
    });
    document.addEventListener('keydown', function (e) {
      // Alt+A via e.code: layout-independent (e.key is "å" on macOS).
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        setOpen(panel.hasAttribute('hidden'), false);
      } else if (e.key === 'Escape' && !panel.hasAttribute('hidden')) {
        setOpen(false, true);
      }
    });

    document.body.appendChild(status);
    document.body.appendChild(trigger);
    document.body.appendChild(panel);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
