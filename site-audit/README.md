# iecho.ru Audit for Hebrew Recreation
## Scope
- Source audited: https://iecho.ru/
- Audit timestamp (UTC): 2026-02-19
- Method: live crawl (robots/sitemap), HTML extraction, asset inventory, JS/data endpoint inspection

## Canonical URL Set (Discovered)
- https://iecho.ru/
- https://iecho.ru/iecho-bk_tk.php
- https://iecho.ru/iecho-gls.php
- https://iecho.ru/iecho-lcks.php
- https://iecho.ru/iecho-pk.php
- https://iecho.ru/index.php
- https://iecho.ru/installations.php

## Sitemap Gap
- `sitemap.xml` exposes 4 URLs only (`/`, `/iecho-bk_tk.php`, `/iecho-gls.php`, `/iecho-pk.php`).
- Live site also serves at least `/installations.php` and `/iecho-lcks.php` (both should be included in Hebrew rebuild if parity is required).

## Shared Technical Stack
- Server: Apache + PHP pages (`.php`)
- Primary CSS: `css/main.iechomin.css?v=1771448715`
- JS core: `js/scriptsiecho.min.js` + jQuery plugins (Slick, MagnificPopup, Lazy, validator)
- Contact form submission: AJAX to `contact.php` (`libs/contact.js`)
- Analytics/integrations found: Yandex Metrika (`ym(...)`), Roistat events, Facebook domain verification meta

## Dynamic Data Dependencies
- Installations gallery is data-driven from JSON endpoints:
  - `/installations.json` (full records)
  - `/installations-optimized.json` (compressed + indexes)
  - `/spheres-list.json` (filter labels)
- Dataset size currently: 313 installations, 122 cities, 13 distinct sphere keys.
- The gallery scripts expect exact field schema; breaking keys will break filters/rendering.

## Asset Footprint (From Crawled Pages)
- Unique image URLs referenced: 173
- Unique CSS files: 3
- Unique JS files: 13
- Full list exported to `asset_inventory.csv`.

## Localization Surface (RU -> HE)
- Extracted text candidates for translation: 378 strings (`translation_strings.tsv`).
- Includes headings, menu labels, CTA/button labels, and form placeholders.
- Additional JS-embedded strings also require translation (e.g., popup titles in `filter-script.js` and `js/scriptsiecho.min.js`).

## RTL/ Hebrew Recreation Requirements
- Set `<html lang="he" dir="rtl">` on all pages.
- Add RTL overrides for directional CSS (`left/right`, paddings, pseudo-elements, menu dropdown alignment, fixed filters).
- Validate all interactive components in RTL: sliders, tab strips, popup forms, map tooltip placement, installations filters.
- Preserve exact section order, anchors, and assets unless explicitly re-scoped.

## High-Risk Areas for Exact Parity
- Installations page (`installations.php`) due to async JSON loading + filtering logic.
- Minified CSS with many absolute positioning rules; RTL needs targeted non-destructive overrides.
- JS popups/forms include Russian hardcoded strings inside minified JS.

## Deliverables Produced in This Audit
- `url_inventory.csv`
- `asset_inventory.csv`
- `internal_anchor_map.csv`
- `page_manifest.json`
- `translation_strings.tsv`
- `robots.txt`
- `sitemap.xml`
- `installations.json`
- `installations-optimized.json`
- `spheres-list.json`
