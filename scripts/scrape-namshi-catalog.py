#!/usr/bin/env python3
"""Scrape namshiglobalstore.com product catalogue into local CSV/JSON."""

from __future__ import annotations

import csv
import json
import re
import time
import urllib.error
import urllib.request
from html import unescape
from pathlib import Path
from urllib.parse import urljoin

BASE = "https://namshiglobalstore.com"
UA = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
}
OUT_DIR = Path(__file__).resolve().parents[1] / "catalog"
SLEEP_S = 0.35


def fetch(url: str, retries: int = 3) -> str:
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=45) as resp:
                return resp.read().decode("utf-8", "ignore")
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last_err}")


def clean(text: str) -> str:
    text = unescape(re.sub(r"<[^>]+>", " ", text or ""))
    return re.sub(r"\s+", " ", text).strip()


def found_count(html: str) -> int | None:
    m = re.search(r"Found\s+([\d,]+)\s+items", html)
    return int(m.group(1).replace(",", "")) if m else None


def max_page(html: str) -> int:
    pages = [int(p) for p in re.findall(r"[?&]page=(\d+)", html)]
    return max(pages) if pages else 1


def parse_listing(html: str, page_url: str, list_label: str = "") -> list[dict]:
    products: list[dict] = []
    starts = [m.start() for m in re.finditer(r'<div class="product-card"', html)]
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else start + 4000
        chunk = html[start:end]

        id_m = re.search(r"product-detail\?id=(\d+)", chunk)
        if not id_m:
            continue
        product_id = id_m.group(1)

        name = ""
        nm = re.search(
            r'class="product-title"[^>]*>\s*<a[^>]*>\s*(.*?)\s*</a>',
            chunk,
            re.I | re.S,
        )
        if nm:
            name = clean(nm.group(1))
        if not name:
            am = re.search(r'alt="([^"]+)"', chunk)
            name = clean(am.group(1)) if am else ""
        if not name:
            continue

        category = ""
        cm = re.search(r'class="product-brand"[^>]*>\s*(.*?)\s*</span>', chunk, re.I | re.S)
        if cm:
            category = clean(cm.group(1))

        store = ""
        sm = re.search(r'Store:\s*([^<\n]+)', chunk)
        if sm:
            store = clean(sm.group(1))

        prices = re.findall(r"\$\s*([\d,]+(?:\.\d+)?)", chunk)
        price = float(prices[0].replace(",", "")) if prices else None
        compare = float(prices[1].replace(",", "")) if len(prices) > 1 else None

        img = ""
        im = re.search(r'<img[^>]+src="([^"]+)"', chunk, re.I)
        if im:
            img = unescape(urljoin(BASE, im.group(1)))

        products.append(
            {
                "source_id": product_id,
                "name": name,
                "category": category,
                "list_context": list_label,
                "store": store,
                "price": price,
                "compare_price": compare,
                "image_url": img,
                "product_url": f"{BASE}/product-detail?id={product_id}&demo=0",
                "source_page": page_url,
            }
        )
    return products


def scrape_paginated(path_query: str, list_label: str) -> list[dict]:
    """path_query like 'products' or 'products?subcategory_id=1' (no page)."""
    sep = "&" if "?" in path_query else "?"
    url1 = f"{BASE}/{path_query}{sep}page=1"
    print(f"→ {url1}")
    html1 = fetch(url1)
    total = found_count(html1)
    last = max_page(html1)
    print(f"  listed={total} pages={last} label={list_label!r}")

    rows = parse_listing(html1, url1, list_label)
    for page in range(2, last + 1):
        url = f"{BASE}/{path_query}{sep}page={page}"
        try:
            html = fetch(url)
        except Exception as e:  # noqa: BLE001
            print(f"  skip page {page}: {e}")
            continue
        page_rows = parse_listing(html, url, list_label)
        rows.extend(page_rows)
        if page % 5 == 0 or page == last:
            print(f"  page {page}/{last} (+{len(page_rows)}, total rows {len(rows)})")
        time.sleep(SLEEP_S)
    return rows


def discover_subcategories(html: str) -> list[tuple[str, str]]:
    """Return list of (subcategory_id, name)."""
    found: dict[str, str] = {}
    for m in re.finditer(
        r'href="[^"]*subcategory_id=(\d+)"[^>]*>\s*([^<]+?)\s*<',
        html,
        re.I,
    ):
        sid, name = m.group(1), clean(m.group(2))
        if name and sid not in found:
            found[sid] = name
    return sorted(found.items(), key=lambda x: int(x[0]))


def merge_by_id(primary: list[dict], extras: list[dict]) -> list[dict]:
    by_id: dict[str, dict] = {}
    for row in primary:
        by_id[row["source_id"]] = dict(row)
        by_id[row["source_id"]]["subcategories"] = []

    for row in extras:
        pid = row["source_id"]
        if pid not in by_id:
            by_id[pid] = dict(row)
            by_id[pid]["subcategories"] = []
        label = row.get("list_context") or ""
        if label and label not in by_id[pid]["subcategories"]:
            by_id[pid]["subcategories"].append(label)
        # Fill missing category from subcategory scrape if needed
        if not by_id[pid].get("category") and row.get("category"):
            by_id[pid]["category"] = row["category"]

    out = list(by_id.values())
    for row in out:
        row["subcategories"] = ", ".join(row.get("subcategories") or [])
    out.sort(key=lambda r: int(r["source_id"]))
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1) Full Shop All catalogue
    shop_all = scrape_paginated("products", "Shop All")

    # 2) Discover subcategories from shop-all + subcategory=1 page
    seed_html = fetch(f"{BASE}/products?subcategory_id=1&page=1")
    subcats = discover_subcategories(seed_html)
    # also from shop all page 1
    subcats_map = dict(subcats)
    for sid, name in discover_subcategories(fetch(f"{BASE}/products?page=1")):
        subcats_map.setdefault(sid, name)
    subcats = sorted(subcats_map.items(), key=lambda x: int(x[0]))
    print(f"Discovered {len(subcats)} subcategories")

    # 3) Scrape each subcategory for membership / category enrichment
    sub_rows: list[dict] = []
    for sid, name in subcats:
        rows = scrape_paginated(f"products?subcategory_id={sid}", name)
        sub_rows.extend(rows)
        time.sleep(SLEEP_S)

    merged = merge_by_id(shop_all, sub_rows)

    # Prefer product-brand category; also keep primary subcategory if only one
    for row in merged:
        if not row.get("category") and row.get("subcategories"):
            row["category"] = row["subcategories"].split(",")[0].strip()

    stamp = time.strftime("%Y%m%d")
    json_path = OUT_DIR / f"namshi-catalog-{stamp}.json"
    csv_path = OUT_DIR / f"namshi-catalog-{stamp}.csv"
    latest_json = OUT_DIR / "namshi-catalog.json"
    latest_csv = OUT_DIR / "namshi-catalog.csv"

    payload = {
        "source": BASE,
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "shop_all_count_reported": found_count(fetch(f"{BASE}/products?page=1")),
        "product_count": len(merged),
        "subcategories_scraped": len(subcats),
        "products": merged,
    }

    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    latest_json.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    fields = [
        "source_id",
        "name",
        "category",
        "subcategories",
        "store",
        "price",
        "compare_price",
        "image_url",
        "product_url",
    ]
    for path in (csv_path, latest_csv):
        with path.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            w.writeheader()
            for row in merged:
                w.writerow(row)

    # Also a slim names+categories file
    slim_path = OUT_DIR / "namshi-catalog-names-categories.csv"
    with slim_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f, fieldnames=["source_id", "name", "category", "subcategories", "store"]
        )
        w.writeheader()
        for row in merged:
            w.writerow(
                {
                    "source_id": row["source_id"],
                    "name": row["name"],
                    "category": row["category"],
                    "subcategories": row["subcategories"],
                    "store": row["store"],
                }
            )

    print("\n=== DONE ===")
    print(f"Products: {len(merged)}")
    print(f"JSON: {latest_json}")
    print(f"CSV:  {latest_csv}")
    print(f"Slim: {slim_path}")


if __name__ == "__main__":
    main()
