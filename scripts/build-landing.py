#!/usr/bin/env python3
"""Rebuild landing-site/index.html from the Claude Design source.

Usage: python3 scripts/build-landing.py
Input : countme-site-src/CountMe Waitlist.dc.html  (design source, edit/replace this)
Output: landing-site/index.html

Keeps from the existing page: <head> (title/meta/favicon/runtime script) and the self-hosted
@font-face block (no Google Fonts). Takes from the source: styles, template, logic.
The bundled runtime needs camelCase attributes encoded as sc-camel-* (onChange -> sc-camel-on-change).
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'landing-site' / 'index.html'
SRC = ROOT / 'countme-site-src' / 'CountMe Waitlist.dc.html'

# design-source asset name -> hashed file already in landing-site/assets
ASSETS = {
    'assets/countme-logo.png': 'assets/33e2741e-f398-4345-9e3c-5029e7ff4226.png',
    'assets/shekel.png': 'assets/8f2203f1-73fd-4d41-a31e-0b86b8c3b796.png',
}

# The bundled runtime calls componentDidUpdate(prevProps) without prevState.
OLD_DID_UPDATE = """  componentDidUpdate(_, prev) {
    if (prev.msgs !== this.state.msgs || prev.typing !== this.state.typing) {
      const el = this.listRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }"""
NEW_DID_UPDATE = """  // The bundled runtime calls componentDidUpdate(prevProps) with no prevState, so track the previous values ourselves.
  componentDidUpdate() {
    const { msgs, typing } = this.state;
    if (this.seenMsgs !== msgs || this.seenTyping !== typing) {
      this.seenMsgs = msgs;
      this.seenTyping = typing;
      const el = this.listRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }"""


# Fixes applied after conversion, so they survive a re-export of the design.
# Each entry: (description, old, new, expected occurrences). `old` is a string or a compiled regex.
# The build fails loudly if the design changed under a patch.
A11Y_STATEMENT_OLD = '<p style="margin:0;font-size:12px;color:#7A8291;">ההצהרה עודכנה לאחרונה: {{ a11yDate }}</p>'
A11Y_STATEMENT_NEW = (
    '<p style="margin:0;">מגבלות ידועות: טרם נערכה בדיקה ידנית של האתר עם קוראי מסך (NVDA, JAWS, VoiceOver).</p>\n'
    '        <p style="margin:0;">מועד בדיקת הנגישות האחרונה: 26 באוקטובר 2026, בדיקה אוטומטית (axe-core) ובדיקת ניווט במקלדת.</p>\n'
    '        ' + A11Y_STATEMENT_OLD
)

_LINK = 'color:#0F1626;text-decoration:underline;text-underline-offset:2px;'
_LABEL = 'display:flex;align-items:flex-start;gap:10px;padding:6px 8px 2px;cursor:pointer;text-align:right;'
_BOX = 'flex:none;width:18px;height:18px;margin:1px 0 0;accent-color:#0F1626;cursor:pointer;'
_TXT = 'font-size:13px;line-height:1.55;color:#5A6273;'
CONSENT_OLD = re.compile(r'<label style="display:flex;align-items:flex-start;gap:10px;padding:6px 8px 4px;cursor:pointer;text-align:right;">.*?</label>', re.S)
CONSENT_NEW = (
    '<div role="group" aria-label="הסכמות להרשמה" style="display:flex;flex-direction:column;gap:4px;">\n'
    f'          <label style="{_LABEL}">\n'
    f'            <input type="checkbox" checked="{{{{ consent }}}}" sc-camel-on-change="{{{{ onConsent }}}}" aria-required="true" aria-describedby="cm-consent-note" style="{_BOX}">\n'
    f'            <span style="{_TXT}">קראתי ואני מסכים/ה ל<a href="legal/terms-of-use.html" target="_blank" rel="noopener" style="{_LINK}" style-hover="color:#5B3FD9;">תנאי השימוש</a> '
    f'ול<a href="legal/privacy-policy.html" target="_blank" rel="noopener" style="{_LINK}" style-hover="color:#5B3FD9;">מדיניות הפרטיות</a> של רשימת ההמתנה (חובה).</span>\n'
    '          </label>\n'
    f'          <p id="cm-consent-note" style="margin:0;padding-inline-start:36px;padding-inline-end:8px;font-size:12px;line-height:1.5;color:#5A6273;text-align:right;">'
    'ההסכמה נוגעת לרשימת ההמתנה בלבד, ואינה הסכמה לתנאי השימוש ולמדיניות הפרטיות של האתר או של המוצר עצמו, שיחולו בנפרד. '
    'אין חובה להירשם לרשימה כדי להשתמש במוצר, ואין חובה להשתמש במוצר כדי להירשם.</p>\n'
    f'          <label style="{_LABEL}">\n'
    f'            <input type="checkbox" checked="{{{{ marketing }}}}" sc-camel-on-change="{{{{ onMarketing }}}}" style="{_BOX}">\n'
    f'            <span style="{_TXT}">אני מאשר/ת לקבל עדכונים ותוכן שיווקי מ-CountMe בדוא״ל ובהודעות SMS (רשות). אפשר לבטל בכל עת. נשבעים שלא ספאם.</span>\n'
    '          </label>\n'
    '        </div>'
)

PAUSE_BUTTON_OLD = re.compile(r'<button type="button" sc-camel-on-click="\{\{ toggleMotion \}\}".*?</button>\n?', re.S)

PATCHES = [
    # --- consent: two separate boxes (terms/privacy required, marketing optional) ---
    ('form: split consent into terms (required) + marketing (optional)', CONSENT_OLD, CONSENT_NEW, 1),
    ('form: marketing state', "consent: false,", "consent: false, marketing: false,", 1),
    ('form: marketing handlers', "consent: this.state.consent,",
     "consent: this.state.consent, marketing: this.state.marketing, onMarketing: e => this.setState({ marketing: e.target.checked }),", 1),
    ('form: terms error message', "כדי שנוכל לחזור אליך, צריך לאשר קבלת עדכונים",
     "כדי להירשם צריך לאשר את תנאי השימוש ומדיניות הפרטיות של רשימת ההמתנה", 1),
    ('brevo: OPT_IN only with marketing consent', "fd.append('OPT_IN', '1');", "if (this.state.marketing) fd.append('OPT_IN', '1');", 1),
    # --- accessibility coordinator + statement ---
    ('statement: coordinator name', "p.a11yName ?? 'תום לב שורץ'", "p.a11yName ?? 'יונתן לוי'", 1),
    ('statement: coordinator name (editor default in data-props)', '&quot;default&quot;:&quot;תום לב שורץ&quot;', '&quot;default&quot;:&quot;יונתן לוי&quot;', 1),
    ('statement: coordinator email (editor default in data-props)', '&quot;default&quot;:&quot;countme5555@gmail.com&quot;', '&quot;default&quot;:&quot;yonilev2003@gmail.com&quot;', 1),
    ('statement: coordinator email', "p.a11yEmail ?? 'countme5555@gmail.com'",
     "p.a11yEmail ?? 'yonilev2003@gmail.com',\n      a11yPhone: p.a11yPhone ?? '054-6192345',\n      a11yPhoneHref: 'tel:+972546192345'", 1),
    ('statement: coordinator phone', '{{ a11yEmail }}</a>.</p>', '{{ a11yEmail }}</a>, טלפון <a href="{{ a11yPhoneHref }}" dir="ltr">{{ a11yPhone }}</a>.</p>', 1),
    ('statement: known limitations + audit date', A11Y_STATEMENT_OLD, A11Y_STATEMENT_NEW, 1),
    ('statement: describe the accessibility widget', 'וניתן לעצור את כל האנימציות בכפתור "עצירת אנימציות" או דרך הגדרות המכשיר.',
     'וניתן להתאים ניגודיות, גודל טקסט, ריווח שורות, גופן ועצירת אנימציות דרך כפתור הנגישות (או בקיצור Alt+A) או דרך הגדרות המכשיר. הכפתור הוא כלי נוחות להתאמה אישית, והנגשת התוכן עצמו נעשית בקוד האתר.', 1),
    ('widget replaces the old stop-animations button', PAUSE_BUTTON_OLD, '', 1),
    # --- IS 5568 fixes ---
    ('contrast: #7A8291 -> #5A6273', '#7A8291', '#5A6273', 3),
    ('contrast: #9AA1AD -> #5A6273', '#9AA1AD', '#5A6273', 1),
    ('focus: keep the global :focus-visible ring on text inputs', 'outline:none;', '', 3),
    ('chat: announce new messages', '<div ref="{{ listRef }}"', '<div ref="{{ listRef }}" role="log" aria-live="polite" aria-label="השיחה עם שקל"', 1),
    ('success message: announce on submit', '<sc-if value="{{ submitted }}" hint-placeholder-val="{{ false }}">\n      <div style=',
     '<sc-if value="{{ submitted }}" hint-placeholder-val="{{ false }}">\n      <div role="alert" style=', 1),
    ('legal links: accessible HTML pages instead of untagged PDFs', 'legal/terms-of-use.pdf', 'legal/terms-of-use.html', 1),
    ('legal links: accessible HTML pages instead of untagged PDFs', 'legal/privacy-policy.pdf', 'legal/privacy-policy.html', 1),
]

WIDGET_HEAD = ['<link rel="stylesheet" href="a11y-widget.css">', '<script src="a11y-widget.js"></script>']


def block(lines, start_pred, end_pred):
    s = next(i for i, l in enumerate(lines) if start_pred(l))
    e = next(i for i in range(s, len(lines)) if end_pred(lines[i]))
    return s, e


def main():
    old = OUT.read_text(encoding='utf-8').split('\n')
    new = SRC.read_text(encoding='utf-8').split('\n')

    xdc = next(i for i, l in enumerate(old) if l.startswith('<x-dc>'))
    head = old[:xdc]
    # accessibility widget (CSS + JS, loaded synchronously so saved preferences apply before first paint)
    for tag in WIDGET_HEAD:
        if tag not in head:
            i = next(j for j, l in enumerate(head) if l.startswith('<script src="assets/'))
            head.insert(i, tag)
    fs, fe = block(old, lambda l: l.startswith('<style>/* hebrew */'), lambda l: l == '</style>')
    fonts = old[fs:fe + 1]

    ns, ne = block(new, lambda l: l == '<style>', lambda l: l == '</style>')
    nstyle = new[ns:ne + 1]
    x0 = next(i for i, l in enumerate(new) if l.startswith('<x-dc>'))
    x1 = next(i for i, l in enumerate(new) if l.strip() == '</x-dc>')
    tmpl = new[x0 + 1:x1]
    he = next(i for i, l in enumerate(tmpl) if l.startswith('</helmet>'))
    body = '\n'.join(tmpl[he + 1:])
    script = new[x1 + 1:]

    body = re.sub(
        r' ((?:on[A-Z]|pathLength|viewBox)[A-Za-z]*)=',
        lambda m: ' sc-camel-' + re.sub(r'([A-Z])', lambda x: '-' + x.group(1).lower(), m.group(1)) + '=',
        body,
    )

    html = '\n'.join(head + ['<x-dc>', '<helmet>'] + fonts + nstyle + ['</helmet>'] + body.split('\n') + ['</x-dc>'] + script)
    for a, b in ASSETS.items():
        html = html.replace(a, b)
    assert OLD_DID_UPDATE in html, 'componentDidUpdate block not found in source'
    html = html.replace(OLD_DID_UPDATE, NEW_DID_UPDATE)
    for what, old, new, expected in PATCHES:
        if isinstance(old, str):
            found = html.count(old)
            assert found == expected, f'patch "{what}": expected {expected} match(es), found {found}'
            html = html.replace(old, new)
        else:
            html, found = old.subn(lambda m: new, html)
            assert found == expected, f'patch "{what}": expected {expected} match(es), found {found}'
    OUT.write_text(html, encoding='utf-8')
    print(f'wrote {OUT.relative_to(ROOT)} ({len(html)} bytes)')


if __name__ == '__main__':
    main()
