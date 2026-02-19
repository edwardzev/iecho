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
