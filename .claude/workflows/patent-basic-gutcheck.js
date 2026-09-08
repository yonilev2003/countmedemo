export const meta = {
  name: 'patent-basic-gutcheck',
  description: 'Basic, non-legal gut-check on the Jurisdiction Packs patent idea — plain-language brief + go/no-go lean',
  phases: [
    { title: 'Draft', detail: 'plain-language brief for a first attorney conversation' },
    { title: 'GutCheck', detail: 'superficial pro/con read, not a legal opinion' },
  ],
}

// Deliberately shallow, 2 agents, per Yoni's explicit ask (2026-09-08):
// "ברמה בסיסית ושטחית" — basic and superficial. The deep prior-art work is
// already done (docs/specs/patent-prior-art-scan-2026-09-08.md) — this is
// NOT a second research pass, just a same-day team gut check.

phase('Draft')
const brief = await agent(
  'Read docs/specs/rag-jurisdiction-packs.md and docs/specs/patent-prior-art-scan-2026-09-08.md ' +
  'in the countme repo (/home/user/countmedemo). Write a SHORT (under 400 words), plain-language, ' +
  'non-technical explanation of the "Jurisdiction Packs / Numberless Retrieval" idea, suitable as ' +
  'the opening brief for a first phone call with a patent attorney who has never heard of it. ' +
  'No jargon, no code, no legal terms. Explain: what problem it solves, the one or two things that ' +
  'make it different from ordinary AI tax software, and why the founder thinks it might be ' +
  'protectable. End with 2-3 plain questions the founder should ask the attorney.',
  { label: 'plain-language brief' },
)

phase('GutCheck')
const gutcheck = await agent(
  'You are doing a SUPERFICIAL, NON-LEGAL sanity check — not a patent opinion, not a second ' +
  'prior-art search (one was already done — read docs/specs/patent-prior-art-scan-2026-09-08.md ' +
  'in the countme repo at /home/user/countmedemo first). ' +
  'Given this plain-language brief of an idea:\n\n' + brief + '\n\n' +
  'Answer briefly, in plain language: ' +
  '(1) does this sound like it describes a concrete technical mechanism (software architecture, ' +
  'data pipeline) rather than just an abstract business idea or "use AI to do X" — this matters ' +
  'for patent eligibility at a basic level; ' +
  '(2) is the differentiation from ordinary tax software explainable in one sentence to a ' +
  'non-expert; ' +
  '(3) given the prior-art scan already found substantial adjacent art for most individual ' +
  'pieces, does pursuing this still look worth a paid attorney consultation, or does it look more ' +
  'like a "build it well and do not worry about patenting" situation; ' +
  '(4) one basic risk to flag before spending money. ' +
  'Be honest and superficial — this is a gut check for a same-day team discussion, not a legal ' +
  'analysis. End with a one-line lean: "worth a consult" / "probably not worth a consult yet" / ' +
  '"unclear, ask X first".',
  { label: 'superficial gut check' },
)

return { brief, gutcheck }
