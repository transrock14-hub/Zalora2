#!/usr/bin/env python3
"""
Scrape product names + prices from zalora.com.ph into a local catalogue.

Uses public product sitemaps for URLs, then each PDP's __NEXT_DATA__.

Run:
  python3 scripts/scrape-zalora-ph-catalog.py
  python3 scripts/scrape-zalora-ph-catalog.py --limit=3000
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import re
import ssl
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from html import unescape
from pathlib import Path

BASE = "https://www.zalora.com.ph"
OUT_DIR = Path(__file__).resolve().parents[1] / "catalog"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
CTX = ssl.create_default_context()
# Zalora PH lists prices in PHP. Convert to USD for the local catalogue.
# Override with --php-per-usd=XX if needed.
DEFAULT_PHP_PER_USD = 61.26  # ~live PHP per 1 USD; override with --php-per-usd
PRICE_MIN_USD = 10.0
PRICE_MAX_USD = 5000.0


def clamp_usd(value: float | None) -> float | None:
    if value is None:
        return None
    if not isinstance(value, (int, float)) or value <= 0:
        return PRICE_MIN_USD
    return round(min(PRICE_MAX_USD, max(PRICE_MIN_USD, float(value))), 2)


def fetch(url: str, retries: int = 3) -> str:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-PH,en;q=0.9"})
            with urllib.request.urlopen(req, context=CTX, timeout=40) as resp:
                return resp.read().decode("utf-8", "ignore")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(0.8 * (attempt + 1) + random.random() * 0.4)
    raise RuntimeError(f"{url}: {last}")


def collect_product_urls(limit: int) -> list[str]:
    urls: list[str] = []
    for i in range(1, 6):
        xml = fetch(f"{BASE}/product-sitemap-{i}.xml")
        locs = re.findall(r"<loc>(.*?)</loc>", xml)
        urls.extend(locs)
        print(f"sitemap-{i}: +{len(locs)} (total {len(urls)})")
        if len(urls) >= limit * 3:
            break
    # Dedupe, shuffle for category diversity, take limit
    uniq = list(dict.fromkeys(urls))
    random.seed(42)
    random.shuffle(uniq)
    return uniq[:limit]


def parse_pdp(html: str, url: str) -> dict | None:
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return None
    try:
        data = json.loads(m.group(1))
        product = (
            data.get("props", {})
            .get("pageProps", {})
            .get("preloadedState", {})
            .get("pdv", {})
            .get("product")
        )
    except Exception:  # noqa: BLE001
        return None
    if not product or not product.get("Name"):
        return None

    def num(v) -> float | None:
        if v is None or v == "":
            return None
        try:
            return float(str(v).replace(",", "").strip())
        except ValueError:
            return None

    price_php = num(product.get("SpecialPrice")) or num(product.get("Price"))
    list_php = num(product.get("Price"))
    special_php = num(product.get("SpecialPrice"))
    crumbs = product.get("Breadcrumbs") or []
    if isinstance(crumbs, list):
        category = " > ".join(str(c) for c in crumbs if c)
    else:
        category = str(crumbs)

    php_per_usd = getattr(parse_pdp, "php_per_usd", DEFAULT_PHP_PER_USD)
    price_usd = clamp_usd(round(price_php / php_per_usd, 2) if price_php else None)
    list_usd = clamp_usd(round(list_php / php_per_usd, 2) if list_php else None)
    special_usd = clamp_usd(round(special_php / php_per_usd, 2) if special_php else None)
    if list_usd is not None and price_usd is not None and list_usd < price_usd:
        list_usd = round(min(PRICE_MAX_USD, price_usd * 1.15), 2)

    return {
        "sku": product.get("ConfigSku") or "",
        "name": unescape(str(product.get("Name") or "")).strip(),
        "brand": product.get("Brand") or "",
        "category": category,
        "color": product.get("Color") or "",
        "price_usd": price_usd,
        "list_price_usd": list_usd,
        "special_price_usd": special_usd,
        "price_php_original": price_php,
        "list_price_php_original": list_php,
        "special_price_php_original": special_php,
        "currency": "USD",
        "image_url": product.get("MainImageUrl") or "",
        "product_url": product.get("Url") or url,
        "seller": product.get("SellerName") or "",
    }


def scrape_one(url: str) -> dict | None:
    try:
        html = fetch(url)
        return parse_pdp(html, url)
    except Exception as e:  # noqa: BLE001
        return {"_error": str(e), "product_url": url}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=3000)
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument(
        "--php-per-usd",
        type=float,
        default=DEFAULT_PHP_PER_USD,
        help="PHP amount equal to 1 USD (default 56)",
    )
    args = ap.parse_args()
    parse_pdp.php_per_usd = args.php_per_usd  # type: ignore[attr-defined]

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Collecting up to {args.limit} product URLs…")
    print(f"FX: {args.php_per_usd} PHP = 1 USD")
    urls = collect_product_urls(args.limit)
    print(f"Scraping {len(urls)} PDPs with {args.workers} workers…")

    products: list[dict] = []
    errors = 0
    done = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(scrape_one, u): u for u in urls}
        for fut in as_completed(futures):
            done += 1
            row = fut.result()
            if not row or row.get("_error") or not row.get("name"):
                errors += 1
            else:
                products.append(row)
            if done % 100 == 0 or done == len(urls):
                print(f"  … {done}/{len(urls)} done | ok={len(products)} err={errors}")

    # Stable sort by name
    products.sort(key=lambda r: (r.get("name") or "", r.get("sku") or ""))

    stamp = time.strftime("%Y%m%d")
    payload = {
        "source": BASE,
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "target_count": args.limit,
        "product_count": len(products),
        "errors": errors,
        "currency": "USD",
        "currency_note": f"Converted from PHP at {args.php_per_usd} PHP = 1 USD.",
        "php_per_usd": args.php_per_usd,
        "products": products,
    }

    json_path = OUT_DIR / f"zalora-ph-catalog-{stamp}.json"
    csv_path = OUT_DIR / f"zalora-ph-catalog-{stamp}.csv"
    latest_json = OUT_DIR / "zalora-ph-catalog.json"
    latest_csv = OUT_DIR / "zalora-ph-catalog.csv"
    slim_csv = OUT_DIR / "zalora-ph-catalog-names-prices.csv"

    for path in (json_path, latest_json):
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))

    fields = [
        "sku",
        "name",
        "brand",
        "category",
        "color",
        "price_usd",
        "list_price_usd",
        "special_price_usd",
        "price_php_original",
        "list_price_php_original",
        "currency",
        "seller",
        "image_url",
        "product_url",
    ]
    for path in (csv_path, latest_csv):
        with path.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            w.writeheader()
            w.writerows(products)

    with slim_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=["name", "brand", "category", "price_usd", "list_price_usd", "product_url"],
        )
        w.writeheader()
        for r in products:
            w.writerow(
                {
                    "name": r.get("name"),
                    "brand": r.get("brand"),
                    "category": r.get("category"),
                    "price_usd": r.get("price_usd"),
                    "list_price_usd": r.get("list_price_usd"),
                    "product_url": r.get("product_url"),
                }
            )

    prices = [r["price_usd"] for r in products if r.get("price_usd") is not None]
    print("\n=== DONE ===")
    print(f"Products: {len(products)} (errors/skips: {errors})")
    if prices:
        print(
            f"Price USD min/max/avg: ${min(prices):.2f} / ${max(prices):.2f} / ${sum(prices)/len(prices):.2f}"
        )
    print(f"JSON: {latest_json}")
    print(f"CSV:  {latest_csv}")
    print(f"Slim names+prices: {slim_csv}")


if __name__ == "__main__":
    main()
