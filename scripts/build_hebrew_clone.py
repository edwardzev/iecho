#!/usr/bin/env python3
import csv
import json
import os
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote

import requests
from bs4 import BeautifulSoup, Comment

BASE_URL = "https://iecho.ru"
WORKDIR = Path("/Users/edwardzev/iecho")
AUDIT_DIR = WORKDIR / "site-audit"
OUT_DIR = WORKDIR / "hebrew-site"
CACHE_FILE = WORKDIR / ".translation_cache.he.json"

CYR_RE = re.compile(r"[А-Яа-яЁё]")
CSS_URL_RE = re.compile(r"url\(([^)]+)\)")

SKIP_TRANSLATION_PARENT_TAGS = {
    "script",
    "style",
    "noscript",
    "code",
    "pre",
}

RTL_CSS = """/* Hebrew RTL layout overrides for mirrored UI parity */
html[lang="he"][dir="rtl"],
html[lang="he"][dir="rtl"] body {
  direction: rtl;
}

html[lang="he"][dir="rtl"] body {
  text-align: right;
}

@media (min-width: 1200px) {
  html[lang="he"][dir="rtl"] .container-iecho-address > .d-flex {
    flex-direction: row-reverse;
  }

  html[lang="he"][dir="rtl"] .logo-with-menu {
    flex-direction: row-reverse;
  }

  html[lang="he"][dir="rtl"] .menu-main-ul {
    flex-direction: row-reverse;
  }

  html[lang="he"][dir="rtl"] .menu-main-logo {
    margin-right: 0 !important;
    margin-left: 1.5rem !important;
  }

  html[lang="he"][dir="rtl"] .main-contacts-new {
    margin-left: 0 !important;
    margin-right: auto !important;
    text-align: left;
    direction: ltr;
  }

  html[lang="he"][dir="rtl"] .call-order {
    align-items: flex-start;
  }

  html[lang="he"][dir="rtl"] .menu-img-droppp {
    margin-left: 0;
    margin-right: -20px;
    text-align: right;
  }
}

html[lang="he"][dir="rtl"] .iecho-purpose .row,
html[lang="he"][dir="rtl"] .container-main-page-products-top,
html[lang="he"][dir="rtl"] .iecho-top-outer,
html[lang="he"][dir="rtl"] .iecho-top-main-outer {
  flex-direction: row-reverse;
}

html[lang="he"][dir="rtl"] a[href^="tel:"],
html[lang="he"][dir="rtl"] .footer-flexer-phone,
html[lang="he"][dir="rtl"] .footer-main-phone,
html[lang="he"][dir="rtl"] #desktop-phone {
  direction: ltr;
  unicode-bidi: isolate;
  text-align: left;
}

html[lang="he"][dir="rtl"] .h1-p-iecho,
html[lang="he"][dir="rtl"] .h1-p-iecho-2,
html[lang="he"][dir="rtl"] .iecho-purpose-high-p,
html[lang="he"][dir="rtl"] .iecho-purpose-low-p,
html[lang="he"][dir="rtl"] .check_mark_block-ul,
html[lang="he"][dir="rtl"] .column-card,
html[lang="he"][dir="rtl"] .s-dscr {
  text-align: right;
}

html[lang="he"][dir="rtl"] .check_mark_block-ul li,
html[lang="he"][dir="rtl"] .povtor-cities-ul li {
  padding-right: 16px;
  padding-left: 0;
}

html[lang="he"][dir="rtl"] .check_mark_block-ul li::before,
html[lang="he"][dir="rtl"] .povtor-cities-ul li::before,
html[lang="he"][dir="rtl"] .column-card-span::before {
  left: auto;
  right: -16px;
}

html[lang="he"][dir="rtl"] .popup-contact,
html[lang="he"][dir="rtl"] .city-popup,
html[lang="he"][dir="rtl"] .city-popup-title,
html[lang="he"][dir="rtl"] .city-option {
  text-align: right;
}
"""


def read_csv_column(path: Path, column: str) -> list[str]:
    vals = []
    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            val = (row.get(column) or "").strip()
            if val:
                vals.append(val)
    return vals


def local_path_from_url(url: str) -> Path:
    p = urlparse(url)
    path = unquote(p.path)
    if path in ("", "/"):
        path = "/index.php"
    local = OUT_DIR / path.lstrip("/")
    return local


class Translator:
    def __init__(self, cache_file: Path):
        self.cache_file = cache_file
        self.session = requests.Session()
        self.cache = {}
        if cache_file.exists():
            try:
                self.cache = json.loads(cache_file.read_text(encoding="utf-8"))
            except Exception:
                self.cache = {}

    def save(self):
        self.cache_file.write_text(
            json.dumps(self.cache, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    def _translate_raw(self, text: str) -> str:
        for attempt in range(5):
            try:
                resp = self.session.get(
                    "https://translate.googleapis.com/translate_a/single",
                    params={
                        "client": "gtx",
                        "sl": "ru",
                        "tl": "he",
                        "dt": "t",
                        "q": text,
                    },
                    timeout=30,
                )
                resp.raise_for_status()
                data = resp.json()
                translated = "".join(part[0] for part in data[0] if part and part[0])
                time.sleep(0.05)
                return translated.strip() or text
            except Exception:
                if attempt == 4:
                    return text
                time.sleep(0.4 * (attempt + 1))
        return text

    def translate(self, text: str) -> str:
        if not text:
            return text
        if not CYR_RE.search(text):
            return text
        if text in self.cache:
            return self.cache[text]
        translated = self._translate_raw(text)
        self.cache[text] = translated
        return translated

    def translate_many(self, texts: list[str]) -> dict[str, str]:
        pending = [t for t in texts if t and CYR_RE.search(t) and t not in self.cache]
        if not pending:
            return {t: self.cache.get(t, t) for t in texts}

        sep = "\n[[[SEP]]]\n"
        i = 0
        while i < len(pending):
            chunk = []
            size = 0
            while i < len(pending):
                t = pending[i]
                projected = size + len(t) + len(sep)
                if chunk and projected > 3500:
                    break
                chunk.append(t)
                size = projected
                i += 1

            payload = sep.join(chunk)
            translated_payload = self._translate_raw(payload)
            parts = translated_payload.split(sep)

            if len(parts) != len(chunk):
                # Fallback to per-string translation for this chunk
                for t in chunk:
                    self.cache[t] = self._translate_raw(t)
            else:
                for src, dst in zip(chunk, parts):
                    self.cache[src] = (dst or src).strip() or src

            # Persist incrementally to survive interrupted runs
            self.save()

        return {t: self.cache.get(t, t) for t in texts}


class SiteBuilder:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers["User-Agent"] = "Mozilla/5.0 (HebrewCloneBuilder/1.0)"
        self.translator = Translator(CACHE_FILE)
        self.downloaded: dict[str, Path] = {}

    def fetch(self, url: str) -> bytes | None:
        try:
            r = self.session.get(url, timeout=60)
            if r.status_code != 200:
                return None
            return r.content
        except Exception:
            return None

    def download_url(self, url: str):
        if url in self.downloaded:
            return
        lp = local_path_from_url(url)
        if lp.exists() and lp.stat().st_size > 0:
            self.downloaded[url] = lp
            return
        lp.parent.mkdir(parents=True, exist_ok=True)
        data = self.fetch(url)
        if data is None:
            return
        lp.write_bytes(data)
        self.downloaded[url] = lp

    def download_core(self):
        page_urls = read_csv_column(AUDIT_DIR / "url_inventory.csv", "url")
        asset_urls = read_csv_column(AUDIT_DIR / "asset_inventory.csv", "asset_url")

        required = set(page_urls + asset_urls)
        required.update(
            {
                f"{BASE_URL}/installations.json",
                f"{BASE_URL}/installations-optimized.json",
                f"{BASE_URL}/spheres-list.json",
                f"{BASE_URL}/policy.pdf",
            }
        )

        for url in sorted(required):
            if url.startswith(BASE_URL):
                self.download_url(url)

    def download_css_assets(self):
        css_files = list(OUT_DIR.rglob("*.css"))
        for css_file in css_files:
            css_text = css_file.read_text(encoding="utf-8", errors="ignore")
            rel = css_file.relative_to(OUT_DIR).as_posix()
            css_remote = f"{BASE_URL}/{rel}"
            for raw in CSS_URL_RE.findall(css_text):
                ref = raw.strip().strip("\"'")
                if not ref or ref.startswith("data:"):
                    continue
                asset_url = urljoin(css_remote, ref)
                p = urlparse(asset_url)
                if p.netloc not in {"iecho.ru", "www.iecho.ru", ""}:
                    continue
                if not p.path:
                    continue
                self.download_url(asset_url)

    def translate_html_file(self, html_path: Path):
        text = html_path.read_text(encoding="utf-8", errors="ignore")
        soup = BeautifulSoup(text, "lxml")

        if soup.html:
            soup.html["lang"] = "he"
            soup.html["dir"] = "rtl"

        # Inject RTL override stylesheet once per page.
        head = soup.head
        if head and not head.find("link", attrs={"href": re.compile(r"css/rtl-he\\.css")}):
            rtl_link = soup.new_tag("link")
            rtl_link["href"] = "css/rtl-he.css?v=1"
            rtl_link["rel"] = "stylesheet"
            rtl_link["type"] = "text/css"
            main_css = head.find("link", attrs={"href": re.compile(r"css/main\\.iechomin\\.css")})
            if main_css:
                main_css.insert_after(rtl_link)
            else:
                head.append(rtl_link)

        text_targets = []
        for node in soup.find_all(string=True):
            if isinstance(node, Comment):
                continue
            parent = node.parent.name.lower() if node.parent and node.parent.name else ""
            if parent in SKIP_TRANSLATION_PARENT_TAGS:
                continue
            raw = str(node)
            stripped = raw.strip()
            if not stripped:
                continue
            if not CYR_RE.search(stripped):
                continue

            text_targets.append((node, raw, stripped))

        attr_names = [
            "placeholder",
            "title",
            "alt",
            "value",
            "data-error",
            "content",
        ]
        attr_targets = []
        for tag in soup.find_all(True):
            for attr in attr_names:
                val = tag.get(attr)
                if not isinstance(val, str):
                    continue
                if not CYR_RE.search(val):
                    continue
                attr_targets.append((tag, attr, val))

        unique_texts = sorted(
            {stripped for _, _, stripped in text_targets}.union({val for _, _, val in attr_targets}),
            key=len,
            reverse=True,
        )
        translations = self.translator.translate_many(unique_texts)

        for node, raw, stripped in text_targets:
            leading = raw[: len(raw) - len(raw.lstrip())]
            trailing = raw[len(raw.rstrip()) :]
            translated = translations.get(stripped, stripped)
            node.replace_with(f"{leading}{translated}{trailing}")

        for tag, attr, val in attr_targets:
            tag[attr] = translations.get(val, val)

        html_path.write_text(str(soup), encoding="utf-8")

    def translate_html(self):
        html_files = sorted(OUT_DIR.glob("*.php")) + sorted(OUT_DIR.glob("*.html"))
        for path in html_files:
            self.translate_html_file(path)

    def translate_js_russian_literals(self):
        js_files = list(OUT_DIR.rglob("*.js"))
        str_re = re.compile(r'(["\'])([^"\'\\]*[А-Яа-яЁё][^"\'\\]*)\1')

        for js in js_files:
            txt = js.read_text(encoding="utf-8", errors="ignore")
            originals = sorted(set(m.group(2) for m in str_re.finditer(txt)), key=len, reverse=True)
            if not originals:
                continue
            for orig in originals:
                tr = self.translator.translate(orig)
                tr = tr.replace("\\", "\\\\").replace('"', '\\"').replace("'", "\\'")
                txt = txt.replace(orig, tr)
            js.write_text(txt, encoding="utf-8")

    def translate_json_datasets(self):
        installations_path = OUT_DIR / "installations.json"
        spheres_path = OUT_DIR / "spheres-list.json"
        optimized_path = OUT_DIR / "installations-optimized.json"

        if installations_path.exists():
            data = json.loads(installations_path.read_text(encoding="utf-8"))
            for item in data:
                if "city" in item and isinstance(item["city"], str) and CYR_RE.search(item["city"]):
                    item["city"] = self.translator.translate(item["city"])
                if "field" in item and isinstance(item["field"], str) and CYR_RE.search(item["field"]):
                    item["field"] = self.translator.translate(item["field"])
                if "spheres" in item and isinstance(item["spheres"], str) and CYR_RE.search(item["spheres"]):
                    item["spheres"] = self.translator.translate(item["spheres"])

            installations_path.write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )

            compressed = []
            cities_index = {}
            models_index = {}
            spheres_index = {}
            for idx, item in enumerate(data):
                city = item.get("city", "")
                model = item.get("model", "")
                field = item.get("field", "")
                sphere = item.get("spheres", "")
                image = item.get("image", "")
                link = item.get("link", "")
                compressed.append({"c": city, "m": model, "f": field, "s": sphere, "i": image, "l": link})
                cities_index.setdefault(city, []).append(idx)
                models_index.setdefault(model, []).append(idx)
                if sphere:
                    spheres_index.setdefault(sphere, []).append(idx)

            optimized = {
                "data": compressed,
                "indexes": {
                    "cities": cities_index,
                    "models": models_index,
                    "spheres": spheres_index,
                },
            }
            optimized_path.write_text(
                json.dumps(optimized, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )

        if spheres_path.exists():
            spheres = json.loads(spheres_path.read_text(encoding="utf-8"))
            for item in spheres:
                for key in ("master", "slave"):
                    val = item.get(key)
                    if isinstance(val, str) and CYR_RE.search(val):
                        item[key] = self.translator.translate(val)
            spheres_path.write_text(
                json.dumps(spheres, ensure_ascii=False, indent=2), encoding="utf-8"
            )

    def rewrite_absolute_internal_links(self):
        for html_file in OUT_DIR.glob("*.php"):
            txt = html_file.read_text(encoding="utf-8", errors="ignore")
            txt = txt.replace("https://iecho.ru/", "/")
            txt = txt.replace("http://iecho.ru/", "/")
            html_file.write_text(txt, encoding="utf-8")

    def write_readme(self):
        md = OUT_DIR / "README.md"
        md.write_text(
            """
# Hebrew Clone (Initial Build)

This folder is a functional local clone of `iecho.ru` with:
- original page/asset structure mirrored locally
- Russian copy auto-translated to Hebrew (machine translation)
- preserved anchors/sections and JS behaviors

Notes:
- Translation is intentionally provisional and should be copy-reviewed.
- External links to `smart-t.ru` are preserved.
- Run with a static server from this folder root.

Quick run example:

```bash
cd /Users/edwardzev/iecho/hebrew-site
python3 -m http.server 8080
```

Open:
- http://localhost:8080/index.php
- http://localhost:8080/iecho-bk_tk.php
- http://localhost:8080/iecho-gls.php
- http://localhost:8080/iecho-pk.php
- http://localhost:8080/iecho-lcks.php
- http://localhost:8080/installations.php
""".strip()
            + "\n",
            encoding="utf-8",
        )

    def write_rtl_css(self):
        css_dir = OUT_DIR / "css"
        css_dir.mkdir(parents=True, exist_ok=True)
        (css_dir / "rtl-he.css").write_text(RTL_CSS + "\n", encoding="utf-8")

    def run(self):
        print("[1/7] Download core pages/assets")
        self.download_core()
        print("[2/7] Download CSS-referenced assets")
        self.download_css_assets()
        print("[3/7] Translate HTML pages")
        self.translate_html()
        print("[4/7] Translate JS literals")
        self.translate_js_russian_literals()
        print("[5/7] Translate JSON datasets")
        self.translate_json_datasets()
        print("[6/7] Rewrite absolute internal links")
        self.rewrite_absolute_internal_links()
        self.write_rtl_css()
        print("[7/7] Save cache + write README")
        self.translator.save()
        self.write_readme()


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    builder = SiteBuilder()
    builder.run()
    print(f"Clone generated at: {OUT_DIR}")


if __name__ == "__main__":
    main()
