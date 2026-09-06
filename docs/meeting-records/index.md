---
title: "יומן פגישות — countme"
type: moc
tags: [moc, meeting-records, countme]
---

# 🗂️ יומן פגישות — countme

מפת תוכן (MOC) לכל מסמכי הפגישות. מוסכמת שמות: `<נושא>-DDMMYYYY.md`.
כל מסמך נושא frontmatter עם `type: meeting-record`, `date`, `attendees`, `tags`, `status`.

## מסמכים
- [[yoni-tasks-27032026]] — משימות יוני מהפ"ע · 27/03/2026 · `status: open`
- [[cpa-bng-collab-06092026]] — פגישה עם CPA-BNG, שיתוף-פעולה אפשרי · 06/09/2026 · `status: open`

## שליפה אוטומטית (Obsidian + Dataview)
```dataview
TABLE date AS "תאריך", status AS "סטטוס", attendees AS "משתתפים"
FROM "docs/meeting-records"
WHERE type = "meeting-record"
SORT date DESC
```

> דורש את תוסף **Dataview** באובסידיאן. ללא התוסף — רשימת ה-wikilinks למעלה משמשת כניווט,
> וה-tags (`#meeting-record`) מאפשרים שליפה דרך חיפוש/גרף.
