# Build sources for The Willis Writ

index.html at the repo root is generated. Edit the files here, then run:

    python3 -I src/build.py

Files:

1. app.js - all behavior (book engine, layout, hotspots, newspaper, Jefferson letters)
2. scene.css - site styles (header, hero, phone layout, newspaper, closed-book fixes)
3. new.css - 3D book engine styles
4. body.html - page shell (header, tagline, hero text)
5. patch.py and legacy-index.html - older library content that build.py still reads for page text
6. build.py - assembles everything into ../index.html
7. tests/ - Playwright scripts. bleed_test.py (paper outside the cover, first and last 8 degrees) and board_test.py (no board or page-edge strip visible while the cover is under 95 degrees) are the animation regression tests: K=6 python3 -I src/tests/<name>.py. t3.py is a screenshot harness and t35.py a slow-motion walkthrough.

Fonts and images live at the repo root (JSLAncientItalic-J.ttf, OldStandardTT-Bold.woff2, library.jpg, library-m.jpg, cover-*.webp).

Phone layout notes: the smallest text on a phone is MINTXT (11px, the Jefferson plaque size) in app.js; shelf covers scale label and icon together with --lb to stay above it, and the flying cover does the same in counter(). The reader bar has a Spread / One page toggle (#btn-wide, phones only). Spread on an upright phone lays the open book on its side (.bookwrap.rot), and closing from spread returns to one page first.
