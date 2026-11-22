#!/usr/bin/env python3
"""Build news.json for the Legal Wire newspaper on the site.

Runs daily in GitHub Actions (see .github/workflows/news.yml). Standard library only.
Each feed is fetched on its own. If one fails, the stories from its last good run are
kept, so one broken source never empties the paper.

Output: news.json with {"updated": ISO time, "items": [...], "status": {...}}.
Each item: section, title, url, source, date, feed. Headlines and links only.
"""
import json
import re
import sys
import html
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

OUT = sys.argv[1] if len(sys.argv) > 1 else 'news.json'
UA = 'The-Willis-Writ-news/1.0 (+https://github.com/jjwillis111/The-Willis-Writ)'
PER_FEED = 12
MAX_ITEMS = 220

FR = 'https://www.federalregister.gov/api/v1/documents.json'

# Sections: sec, privacy, regs, congress, scotus.
# kind "rss" reads an RSS or Atom feed. kind "fr" queries the Federal Register API.
# Feeds marked CHECK were not confirmed when this was written. If one fails, the log
# says so and the rest still run. Fix or remove the URL here.
FEEDS = [
    # SEC: confirmed on sec.gov/about/rss-feeds
    {'id': 'sec-press', 'section': 'sec', 'source': 'SEC Press Releases', 'kind': 'rss',
     'url': 'https://www.sec.gov/news/pressreleases.rss'},
    {'id': 'sec-lit', 'section': 'sec', 'source': 'SEC Litigation Releases', 'kind': 'rss',
     'url': 'https://www.sec.gov/enforcement-litigation/litigation-releases/rss'},
    {'id': 'sec-admin', 'section': 'sec', 'source': 'SEC Administrative Proceedings', 'kind': 'rss',
     'url': 'https://www.sec.gov/enforcement-litigation/administrative-proceedings/rss'},
    {'id': 'sec-halts', 'section': 'sec', 'source': 'SEC Trading Suspensions', 'kind': 'rss',
     'url': 'https://www.sec.gov/enforcement-litigation/trading-suspensions/rss'},
    {'id': 'sec-speech', 'section': 'sec', 'source': 'SEC Speeches and Statements', 'kind': 'rss',
     'url': 'https://www.sec.gov/news/speeches-statements.rss'},

    # Regulations: Federal Register API (documented as needing no key)
    {'id': 'fr-sec', 'section': 'regs', 'source': 'Federal Register', 'kind': 'fr',
     'params': {'conditions[agencies][]': 'securities-and-exchange-commission',
                'conditions[type][]': ['RULE', 'PRORULE']}},
    {'id': 'fr-ftc', 'section': 'regs', 'source': 'Federal Register', 'kind': 'fr',
     'params': {'conditions[agencies][]': 'federal-trade-commission',
                'conditions[type][]': ['RULE', 'PRORULE']}},

    # Privacy: FTC consent orders appear in the Federal Register as notices, so the API
    # stands in for the FTC press release feed, which refuses automated requests.
    {'id': 'fr-ftc-notices', 'section': 'privacy', 'source': 'Federal Register (FTC)', 'kind': 'fr',
     'params': {'conditions[agencies][]': 'federal-trade-commission',
                'conditions[term]': 'privacy "data security" "personal information" COPPA',
                'conditions[type][]': ['NOTICE']}, 'limit': 8},
    {'id': 'fr-privacy', 'section': 'privacy', 'source': 'Federal Register', 'kind': 'fr',
     'params': {'conditions[term]': 'privacy "personal information" "data security"',
                'conditions[type][]': ['RULE', 'PRORULE']}, 'limit': 8},
    {'id': 'calprivacy', 'section': 'privacy', 'source': 'CalPrivacy', 'kind': 'rss',
     'url': 'https://privacy.ca.gov/category/content-types/news/feed/', 'limit': 8},  # CHECK
    {'id': 'insideprivacy', 'section': 'privacy', 'source': 'Inside Privacy (Covington)', 'kind': 'rss',
     'url': 'https://www.insideprivacy.com/feed/', 'limit': 8},  # CHECK
    {'id': 'dataprotection', 'section': 'privacy', 'source': 'Data Protection Report', 'kind': 'rss',
     'url': 'https://www.dataprotectionreport.com/feed/', 'limit': 8},  # CHECK
    {'id': 'privacy-news', 'section': 'privacy', 'source': 'News', 'kind': 'rss', 'use_source': True, 'limit': 12,
     'url': 'https://news.google.com/rss/search?q=' + urllib.parse.quote(
         '("privacy law" OR "privacy enforcement" OR HIPAA OR COPPA OR CCPA OR "data privacy" OR "attorney general" privacy) when:7d')
         + '&hl=en-US&gl=US&ceid=US:en'},  # CHECK

    # Congress: Congress.gov feeds
    {'id': 'cg-president', 'section': 'congress', 'source': 'Congress.gov', 'kind': 'rss',
     'url': 'https://www.congress.gov/rss/presented-to-president.xml'},  # CHECK
    {'id': 'cg-viewed', 'section': 'congress', 'source': 'Congress.gov', 'kind': 'rss',
     'url': 'https://www.congress.gov/rss/most-viewed-bills.xml'},  # CHECK

    # Supreme Court (supremecourt.gov RSS returned a web page to the bot, so SCOTUSblog only)
    {'id': 'scotusblog', 'section': 'scotus', 'source': 'SCOTUSblog', 'kind': 'rss',
     'url': 'https://www.scotusblog.com/feed/'},  # CHECK
]


def get(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def clean(text):
    text = html.unescape(re.sub(r'<[^>]+>', ' ', text or ''))
    return re.sub(r'\s+', ' ', text).strip()


def to_iso(value):
    """Return an ISO UTC string for an RSS or Atom date, or '' if it cannot be read."""
    value = (value or '').strip()
    if not value:
        return ''
    try:
        dt = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        dt = None
    if dt is None:
        try:
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        except ValueError:
            return ''
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def local(tag):
    return tag.rsplit('}', 1)[-1]


def parse_rss(data, feed):
    root = ET.fromstring(data)
    items = []
    for node in root.iter():
        name = local(node.tag)
        if name not in ('item', 'entry'):
            continue
        fields = {}
        link = ''
        for child in node:
            cn = local(child.tag)
            if cn == 'link':
                link = child.get('href') or (child.text or '').strip() or link
            elif cn not in fields:
                fields[cn] = child.text or ''
        title = clean(fields.get('title'))
        link = link or clean(fields.get('guid'))
        date = to_iso(fields.get('pubDate') or fields.get('updated') or fields.get('published') or fields.get('date'))
        source = feed['source']
        if feed.get('use_source') and clean(fields.get('source')):
            source = clean(fields.get('source'))
            suffix = ' - ' + source
            if title.endswith(suffix):
                title = title[:-len(suffix)].rstrip()
        if title and link.startswith('http'):
            items.append({'section': feed['section'], 'title': title, 'url': link,
                          'source': source, 'date': date, 'feed': feed['id']})
    return items


def fetch_fr(feed):
    params = []
    for key, value in feed['params'].items():
        for v in (value if isinstance(value, list) else [value]):
            params.append((key, v))
    params += [('per_page', str(PER_FEED)), ('order', 'newest'),
               ('fields[]', 'title'), ('fields[]', 'html_url'), ('fields[]', 'publication_date')]
    data = json.loads(get(FR + '?' + urllib.parse.urlencode(params)))
    items = []
    for d in data.get('results', []):
        title, url = clean(d.get('title')), d.get('html_url') or ''
        if title and url.startswith('http'):
            items.append({'section': feed['section'], 'title': title, 'url': url,
                          'source': feed['source'], 'date': to_iso(d.get('publication_date') or ''),
                          'feed': feed['id']})
    return items


def load_old():
    try:
        with open(OUT, encoding='utf-8') as f:
            return json.load(f).get('items', [])
    except (OSError, ValueError):
        return []


def main():
    old = load_old()
    items, status = [], {}
    for feed in FEEDS:
        try:
            got = fetch_fr(feed) if feed['kind'] == 'fr' else parse_rss(get(feed['url']), feed)
            got.sort(key=lambda x: x['date'], reverse=True)
            items += got[:feed.get('limit', PER_FEED)]
            status[feed['id']] = 'ok (%d)' % len(got)
        except Exception as exc:
            kept = [i for i in old if i.get('feed') == feed['id']]
            items += kept
            reason = 'HTTP %d' % exc.code if isinstance(exc, urllib.error.HTTPError) else type(exc).__name__
            status[feed['id']] = 'error: %s (kept %d)' % (reason, len(kept))
        print(feed['id'], status[feed['id']])

    seen, unique = set(), []
    for it in sorted(items, key=lambda x: x['date'], reverse=True):
        if it['url'] in seen:
            continue
        seen.add(it['url'])
        unique.append(it)
    unique = unique[:MAX_ITEMS]

    if not unique and old:
        print('Nothing fetched, leaving news.json as it is.')
        return
    out = {'updated': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
           'items': unique, 'status': status}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('Wrote %d items to %s' % (len(unique), OUT))


if __name__ == '__main__':
    main()
