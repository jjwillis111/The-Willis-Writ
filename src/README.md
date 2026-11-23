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
7. tests/ - Playwright and Chrome DevTools scripts (t3.py is the harness; point URL at the built file)

Fonts and images live at the repo root (JSLAncientItalic-J.ttf, OldStandardTT-Bold.woff2, library.jpg, library-m.jpg, cover-*.webp).
