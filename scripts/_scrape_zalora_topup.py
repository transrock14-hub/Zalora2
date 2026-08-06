#!/usr/bin/env python3
"""Scrape Zalora PH PDPs targeted at category shortfalls (kids, bags, etc.)."""
from __future__ import annotations

import argparse
import json
import random
import re
import ssl
import time
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from html import unescape
from pathlib import Path

BASE = "https://www.zalora.com.ph"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
CTX = ssl.create_default_context()
PHP_PER_USD = 61.26
PRICE_MIN = 10.0
PRICE_MAX = 5000.0


def fetch(url: str, retries: int = 3) -> str:
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": UA, "Accept-Language": "en-PH,en;q=0.9"}
            )
            with urllib.request.urlopen(req, context=CTX, timeout=40) as resp:
                return resp.read().decode("utf-8", "ignore")
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(0.5 * (attempt + 1) + random.random() * 0.3)
    raise RuntimeError(f"{url}: {last}")


def clamp_usd(v: float | None) -> float | None:
    if v is None or v <= 0:
        return PRICE_MIN
    return round(min(PRICE_MAX, max(PRICE_MIN, float(v))), 2)


def map_slug(category: str, name: str = "", url: str = "") -> str | None:
    crumbs = [c.strip().lower() for c in (category or "").split(">") if c.strip()]
    if not crumbs:
        return None
    top = crumbs[0]
    joined = " ".join(crumbs)
    blob = f"{joined} {name} {url}".lower()

    if top == "kids" or any(re.search(r"\bkids?\b", c) for c in crumbs):
        if any(re.search(r"\bgirls?\b", c) for c in crumbs) or re.search(r"\bgirls?\b", blob):
            return "girls"
        if any(re.search(r"\bboys?\b", c) for c in crumbs) or re.search(r"\bboys?\b", blob):
            return "boys"
        # Unspecified kids: prefer girls when topping up gender balance via URL hints
        if "girl" in blob:
            return "girls"
        return "boys"

    if any(re.search(r"bags?|backpack|luggage|clutch|tote|crossbody|wallet|purse|sling", c) for c in crumbs):
        if top == "men" or any(c == "men" or c.startswith("men ") for c in crumbs):
            return "men-bags"
        return "women-bags"

    if any(
        re.search(
            r"shoes?|sneakers?|sandals?|boots?|heels?|footwear|loafers?|slippers?|flats?|flip-?flops?",
            c,
        )
        for c in crumbs
    ):
        if top == "men" or any(c == "men" or c.startswith("men ") for c in crumbs):
            return "men-shoes"
        return "women-shoes"

    if any(re.search(r"electronics?|gadgets?", c) for c in crumbs):
        return "electronics"
    if any(re.search(r"home|garden|furniture|living|kitchen|decor", c) for c in crumbs):
        return "home-garden"
    if any(re.search(r"accessories|watches?|jewellery|jewelry|belts?|sunglasses", c) for c in crumbs):
        return "accessories"
    if top == "men" or any(c == "men" or c.startswith("men ") for c in crumbs):
        return "men-clothing"
    if top in ("women", "luxury") or any("women" in c for c in crumbs):
        return "women-clothing"
    if top == "sports":
        return "men-clothing" if ("men" in joined and "women" not in joined) else "women-clothing"
    if "home" in top:
        return "home-garden"
    return None


def url_score(url: str, targets: set[str]) -> int:
    lu = url.lower()
    s = 0
    # Strong bag signals first when men-bags needed (avoid drowning in kids URLs)
    if "men-bags" in targets or "women-bags" in targets:
        if re.search(
            r"handbag|backpack|tote|crossbody|clutch|sling-bag|messenger|duffel|duffle|wallet|briefcase|shoulder-bag|belt-bag",
            lu,
        ):
            s += 12
        elif re.search(r"(^|-)bags?(-|$)", lu) and "baggy" not in lu:
            s += 9
        if "men" in lu and "women" not in lu and "bag" in lu:
            s += 6
    if "girls" in targets:
        if "girl" in lu and "baggy" not in lu:
            s += 8
        if re.search(r"(^|-)kids?(-|$)", lu):
            s += 3
    if "boys" in targets:
        if re.search(r"(^|-)boys?(-|$)", lu) or re.search(r"-boy-", lu):
            s += 8
        if re.search(r"(^|-)kids?(-|$)", lu) and "girl" not in lu:
            s += 5
    if "home-garden" in targets and re.search(r"home|kitchen|decor|furniture|garden", lu):
        s += 4
    if "electronics" in targets and re.search(r"electron|gadget|headphone|charger", lu):
        s += 4
    return s


def collect_urls() -> list[str]:
    urls: list[str] = []
    for i in range(1, 6):
        xml = fetch(f"{BASE}/product-sitemap-{i}.xml")
        urls.extend(re.findall(r"<loc>(.*?)</loc>", xml))
        print(f"sitemap-{i}: total {len(urls)}")
    return list(dict.fromkeys(urls))


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

    def num(v):
        if v is None or v == "":
            return None
        try:
            return float(str(v).replace(",", "").strip())
        except ValueError:
            return None

    price_php = num(product.get("SpecialPrice")) or num(product.get("Price"))
    list_php = num(product.get("Price"))
    crumbs = product.get("Breadcrumbs") or []
    category = " > ".join(str(c) for c in crumbs if c) if isinstance(crumbs, list) else str(crumbs)
    price_usd = clamp_usd(round(price_php / PHP_PER_USD, 2) if price_php else None)
    list_usd = clamp_usd(round(list_php / PHP_PER_USD, 2) if list_php else None)
    return {
        "sku": product.get("ConfigSku") or "",
        "name": unescape(str(product.get("Name") or "")).strip(),
        "brand": product.get("Brand") or "",
        "category": category,
        "color": product.get("Color") or "",
        "price_usd": price_usd,
        "list_price_usd": list_usd,
        "image_url": product.get("MainImageUrl") or "",
        "product_url": product.get("Url") or url,
        "seller": product.get("SellerName") or "",
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--needs", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--workers", type=int, default=16)
    ap.add_argument("--max-scrape", type=int, default=4000)
    args = ap.parse_args()

    needs_raw = json.loads(Path(args.needs).read_text())
    needs: dict[str, int] = {k: int(v) for k, v in needs_raw.get("needs", {}).items() if int(v) > 0}
    # scrape extra buffer per slug
    targets = {k: v + 50 for k, v in needs.items()}
    print("targets (with buffer):", targets)

    urls = collect_urls()
    # Build a balanced candidate list per target so kids URLs don't starve bags
    candidates: list[str] = []
    seen_c: set[str] = set()
    per_target_cap = max(400, args.max_scrape // max(1, len(targets)))
    for slug in targets:
        ranked = sorted(urls, key=lambda u: url_score(u, {slug}), reverse=True)
        picked = [u for u in ranked if url_score(u, {slug}) > 0][:per_target_cap]
        for u in picked:
            if u not in seen_c:
                seen_c.add(u)
                candidates.append(u)
    if len(candidates) < args.max_scrape:
        random.seed(7)
        rest = [u for u in urls if u not in seen_c]
        random.shuffle(rest)
        for u in rest[: args.max_scrape - len(candidates)]:
            candidates.append(u)
    print(f"scraping up to {len(candidates)} PDPs (balanced pools)…")

    collected: dict[str, list[dict]] = defaultdict(list)
    done = 0
    errors = 0

    def one(u: str):
        try:
            return parse_pdp(fetch(u), u)
        except Exception:  # noqa: BLE001
            return None

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs = {pool.submit(one, u): u for u in candidates}
        for fut in as_completed(futs):
            done += 1
            row = fut.result()
            if not row:
                errors += 1
            else:
                slug = map_slug(
                    row.get("category") or "",
                    row.get("name") or "",
                    row.get("product_url") or "",
                )
                if slug and slug in targets and len(collected[slug]) < targets[slug]:
                    collected[slug].append(row)
            if done % 100 == 0 or done == len(candidates):
                filled = {k: len(v) for k, v in collected.items()}
                print(f"  … {done}/{len(candidates)} | filled={filled} err={errors}")
            # early stop if all filled
            if all(len(collected.get(k, [])) >= targets[k] for k in targets):
                print("All targets filled — stopping early")
                break

    products: list[dict] = []
    for slug, need in needs.items():
        products.extend(collected.get(slug, [])[: need + 30])

    # dedupe by sku
    seen = set()
    uniq = []
    for p in products:
        sku = p.get("sku") or p.get("product_url")
        if sku in seen:
            continue
        seen.add(sku)
        uniq.append(p)

    payload = {
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "needs": needs,
        "filled": {k: len(collected.get(k, [])) for k in needs},
        "product_count": len(uniq),
        "products": uniq,
    }
    Path(args.out).write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    print("DONE filled", payload["filled"], "wrote", args.out, "products", len(uniq))


if __name__ == "__main__":
    main()
