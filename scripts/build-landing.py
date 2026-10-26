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


# Accessibility / IS 5568 fixes applied after conversion, so they survive a re-export of the design.
# Each entry: (description, old, new, expected occurrences). The build fails loudly if the design changed under us.
A11Y_STATEMENT_OLD = '<p style="margin:0;font-size:12px;color:#7A8291;">ההצהרה עודכנה לאחרונה: {{ a11yDate }}</p>'
A11Y_STATEMENT_NEW = (
    '<p style="margin:0;">מגבלות ידועות: טרם נערכה בדיקה ידנית של האתר עם קוראי מסך (NVDA, JAWS, VoiceOver), '
    'וטרם התקבלה חוות דעת של מומחה נגישות מוסמך.</p>\n'
    '        <p style="margin:0;">מועד בדיקת הנגישות האחרונה: 26 באוקטובר 2026, בדיקה אוטומטית (axe-core) ובדיקת ניווט במקלדת.</p>\n'
    '        ' + A11Y_STATEMENT_OLD
)
PATCHES = [
    ('statement: known limitations + audit date', A11Y_STATEMENT_OLD, A11Y_STATEMENT_NEW, 1),
    ('contrast: #7A8291 -> #5A6273', '#7A8291', '#5A6273', 3),
    ('contrast: #9AA1AD -> #5A6273', '#9AA1AD', '#5A6273', 1),
    ('focus: keep the global :focus-visible ring on text inputs', 'outline:none;', '', 3),
    ('chat: announce new messages', '<div ref="{{ listRef }}"', '<div ref="{{ listRef }}" role="log" aria-live="polite" aria-label="השיחה עם שקל"', 1),
    ('success message: announce on submit', '<sc-if value="{{ submitted }}" hint-placeholder-val="{{ false }}">\n      <div style=',
     '<sc-if value="{{ submitted }}" hint-placeholder-val="{{ false }}">\n      <div role="alert" style=', 1),
    ('legal links: accessible HTML pages instead of untagged PDFs', 'legal/terms-of-use.pdf', 'legal/terms-of-use.html', 2),
    ('legal links: accessible HTML pages instead of untagged PDFs', 'legal/privacy-policy.pdf', 'legal/privacy-policy.html', 2),
]


def block(lines, start_pred, end_pred):
    s = next(i for i, l in enumerate(lines) if start_pred(l))
    e = next(i for i in range(s, len(lines)) if end_pred(lines[i]))
    return s, e


def main():
    old = OUT.read_text(encoding='utf-8').split('\n')
    new = SRC.read_text(encoding='utf-8').split('\n')

    xdc = next(i for i, l in enumerate(old) if l.startswith('<x-dc>'))
    head = old[:xdc]
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
        found = html.count(old)
        assert found == expected, f'patch "{what}": expected {expected} match(es), found {found}'
        html = html.replace(old, new)
    OUT.write_text(html, encoding='utf-8')
    print(f'wrote {OUT.relative_to(ROOT)} ({len(html)} bytes)')


if __name__ == '__main__':
    main()
