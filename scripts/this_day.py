#!/usr/bin/env python3
"""This Day in Legal History: build this-day.json for the hourglass on the site.

Reads Wikipedia's On This Day feed, keeps the entries that are about law, and writes a small
JSON file with a link back to the Wikipedia article for each one. Nothing is hand-written.
Standard library only.

Daily use (GitHub Action):
    python scripts/this_day.py --out this-day.json
    python scripts/this_day.py --date 2026-12-09 --out this-day.json

Testing a whole month (writes a report with every day's matches, for review):
    python scripts/this_day.py --month 12 --report reports/otd-december.json
    python scripts/this_day.py --month 12 --survey --report reports/otd-december.json   (adds counts for all months)

If the feed cannot be read, the previous output file is left alone, so the hourglass never goes blank.
"""
import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from calendar import monthrange
from datetime import datetime, timezone

UA = 'The-Willis-Writ-this-day/1.0 (+https://github.com/jjwillis111/The-Willis-Writ)'
FEED = 'https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/{mm:02d}/{dd:02d}'
KEEP = 3                      # entries written per day
LEAP_YEAR = 2024              # lets --month 2 include Feb 29

# An entry needs at least MIN_SCORE points to count as legal history.
# STRONG terms are specific to law and score 2. WEAK terms are common words that often mean something else, score 1.
MIN_SCORE = 2
STRONG = [
    r'supreme court', r'court of appeals?', r'court[- ]martial', r'high court', r'constitutional court',
    r'constitution(?:al)?', r'amendment', r'bill of rights', r'habeas corpus', r'indict(?:ed|ment)',
    r'impeach(?:ed|ment)?', r'convict(?:ed|ion)', r'acquit(?:ted|tal)', r'sentenced', r'verdict',
    r'\btrial\b', r'tribunal', r'lawsuit', r'\bsued\b', r'\bruled\b', r'\bruling\b', r'\bjudge\b',
    r'chief justice', r'justice of the', r'signed into law', r'\benacted\b', r'legislation', r'statute',
    r'\b(?:[A-Z][A-Za-z\-]+ ){1,5}Act\b', r'\bpatent', r'copyright', r'antitrust', r'nuremberg', r'magna carta',
    r'civil rights', r'\bv\. ', r'legaliz', r'decriminaliz', r'outlaw', r'\bpardon', r'extradit', r'testif',
    r'international law', r'law of the sea', r'geneva convention', r'human rights', r'\bcharter\b',
]
WEAK = [r'\btreaty\b', r'\blaws?\b', r'\blegal\b', r'\bcourt\b', r'attorney', r'prosecut', r'\bsenate\b',
        r'\bcongress\b', r'ratif', r'abolish', r'\bbanned\b', r'\bpolice\b', r'\barrested\b', r'\bexecuted\b']
# Entries whose text matches this are about sport, entertainment or similar, even when a legal word appears.
NOISE = re.compile(r'\b(NBA|NFL|MLB|NHL|tennis|golf|Grand Slam|Super Bowl|World Series|film|album|single|episode|'
                   r'television series|sitcom|video game|musical|opera|novel)\b', re.I)
STRONG_RE = [re.compile(p, re.I if not p.startswith(r'\b(?:[A-Z]') else 0) for p in STRONG]
WEAK_RE = [re.compile(p, re.I) for p in WEAK]


def score(text, extra=''):
    """Return (points, matched terms) for one entry. extra is the linked article titles and blurbs."""
    hay = text + ' ' + extra
    terms, pts = [], 0
    for rx in STRONG_RE:
        m = rx.search(text)            # strong terms must appear in the event text itself
        if m:
            terms.append(m.group(0).strip().lower()); pts += 2
    for rx in WEAK_RE:
        m = rx.search(hay)
        if m:
            terms.append(m.group(0).strip().lower() + '?'); pts += 1
    if NOISE.search(text):
        pts -= 3
    return pts, terms


def fetch(mm, dd, tries=4):
    url = FEED.format(mm=mm, dd=dd)
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError('feed failed for %02d-%02d: %s' % (mm, dd, last))


def entries(feed):
    """All dated events for the day, with the first linked article for the source link."""
    seen, out = set(), []
    for key in ('selected', 'events'):
        for ev in feed.get(key, []):
            text = (ev.get('text') or '').strip()
            if not text or text in seen:
                continue
            seen.add(text)
            pages = ev.get('pages') or []
            page = pages[0] if pages else {}
            url = ((page.get('content_urls') or {}).get('desktop') or {}).get('page', '')
            extra = ' '.join('%s %s' % (p.get('normalizedtitle', ''), p.get('description', '') or '') for p in pages)
            out.append({'year': ev.get('year'), 'text': text, 'title': page.get('normalizedtitle', ''), 'url': url,
                        'extra': extra, 'curated': key == 'selected'})
    return out


def legal(feed):
    res = []
    for e in entries(feed):
        pts, terms = score(e['text'], e['extra'])
        e = dict(e, score=pts, terms=terms)
        res.append(e)
    return res


def pick(scored):
    """Best KEEP legal entries: highest score first, curated entries and older years break ties."""
    good = [e for e in scored if e['score'] >= MIN_SCORE and e['url']]
    good.sort(key=lambda e: (-e['score'], not e['curated'], e['year'] if isinstance(e['year'], int) else 9999))
    return good[:KEEP]


def public(e):
    return {'year': e['year'], 'text': e['text'], 'title': e['title'], 'url': e['url']}


def run_day(date, out_path):
    feed = fetch(date.month, date.day)
    top = pick(legal(feed))
    if not top:
        raise RuntimeError('no legal entries for %s, keeping the previous file' % date.isoformat())
    data = {'date': date.isoformat(), 'month': date.month, 'day': date.day, 'source': 'Wikipedia, On This Day',
            'updated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'entries': [public(e) for e in top]}
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print('wrote %s: %d entries for %s' % (out_path, len(top), date.isoformat()))


def run_month(month, report_path, survey):
    days = {}
    for dd in range(1, monthrange(LEAP_YEAR, month)[1] + 1):
        try:
            feed = fetch(month, dd)
        except RuntimeError as e:
            days['%02d' % dd] = {'error': str(e)}; print(e, file=sys.stderr); continue
        sc = legal(feed)
        kept = [e for e in sc if e['score'] >= MIN_SCORE]
        near = [e for e in sc if 0 < e['score'] < MIN_SCORE]
        chosen = pick(sc)
        days['%02d' % dd] = {
            'events': len(sc), 'legal': len(kept), 'chosen': [dict(public(e), score=e['score'], terms=e['terms']) for e in chosen],
            'all_legal': [dict(public(e), score=e['score'], terms=e['terms']) for e in kept],
            'near_misses': [dict(public(e), score=e['score'], terms=e['terms']) for e in near[:6]],
        }
        print('%02d-%02d events %3d legal %2d chosen %d' % (month, dd, len(sc), len(kept), len(chosen)), flush=True)
        time.sleep(0.15)
    report = {'month': month, 'generated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'), 'days': days}
    if survey:
        counts = {}
        for mm in range(1, 13):
            row = []
            for dd in range(1, monthrange(LEAP_YEAR, mm)[1] + 1):
                try:
                    sc = legal(fetch(mm, dd))
                    row.append([len(sc), sum(1 for e in sc if e['score'] >= MIN_SCORE), len(pick(sc))])
                except RuntimeError as e:
                    row.append(None); print(e, file=sys.stderr)
                time.sleep(0.15)
            counts['%02d' % mm] = row
            print('survey month %02d done' % mm, flush=True)
        report['survey'] = counts
    import os
    os.makedirs(os.path.dirname(report_path) or '.', exist_ok=True)
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False)
    print('report written to', report_path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--date', help='YYYY-MM-DD, default today (UTC)')
    ap.add_argument('--out', default='this-day.json')
    ap.add_argument('--month', type=int, help='test every day of this month and write a report')
    ap.add_argument('--survey', action='store_true', help='with --month, also count legal entries for every day of the year')
    ap.add_argument('--report', default='reports/otd-month.json')
    a = ap.parse_args()
    try:
        if a.month:
            run_month(a.month, a.report, a.survey)
        else:
            d = datetime.strptime(a.date, '%Y-%m-%d') if a.date else datetime.now(timezone.utc)
            run_day(d, a.out)
    except RuntimeError as e:
        print('error:', e, file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
