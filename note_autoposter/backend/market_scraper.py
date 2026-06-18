"""
Real-time market research scraper for note.com and brain.fm.
Scrapes trending / best-selling articles to inform content strategy.
"""

import httpx
import asyncio
import re
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ja,en;q=0.9",
}

async def scrape_note_trending(limit: int = 20) -> list[dict]:
    """Scrape note.com trending paid articles."""
    results = []
    urls = [
        "https://note.com/search?q=%E5%89%AF%E6%A5%AD+AI&sort=like&paid=1",
        "https://note.com/search?q=ChatGPT+%E7%A8%BC%E3%81%90&sort=like&paid=1",
        "https://note.com/search?q=Claude+%E5%89%AF%E6%A5%AD&sort=like&paid=1",
        "https://note.com/search?q=AI+%E8%87%AA%E5%8B%95%E5%8C%96+%E5%89%AF%E6%A5%AD&sort=like",
    ]
    async with httpx.AsyncClient(headers=HEADERS, timeout=15, follow_redirects=True) as client:
        for url in urls[:2]:
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "html.parser")
                cards = soup.select("article, .note-item, [data-testid='note-item']")
                for card in cards[:10]:
                    title_el = card.select_one("h3, h2, .note-title, [class*='title']")
                    price_el = card.select_one("[class*='price'], .price")
                    like_el = card.select_one("[class*='like'], [class*='count']")
                    link_el = card.select_one("a[href*='/n/']")

                    title = title_el.get_text(strip=True) if title_el else ""
                    price_text = price_el.get_text(strip=True) if price_el else ""
                    likes = like_el.get_text(strip=True) if like_el else "0"
                    href = link_el["href"] if link_el else ""

                    price = 0
                    m = re.search(r"[\d,]+", price_text)
                    if m:
                        price = int(m.group().replace(",", ""))

                    if title and len(title) > 5:
                        results.append({
                            "title": title,
                            "price": price,
                            "likes": likes,
                            "url": f"https://note.com{href}" if href.startswith("/") else href,
                            "source": "note",
                        })
                await asyncio.sleep(1)
            except Exception as e:
                print(f"Scrape error {url}: {e}")
                continue

    results = results[:limit]
    return results

async def scrape_brain_trending(limit: int = 10) -> list[dict]:
    """Scrape brain.fm trending articles."""
    results = []
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=15, follow_redirects=True) as client:
            resp = await client.get("https://brain.fm/search?q=AI+%E5%89%AF%E6%A5%AD&sort=popular")
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                items = soup.select(".product-card, .brain-item, article")
                for item in items[:limit]:
                    title_el = item.select_one("h2, h3, .title")
                    price_el = item.select_one(".price")
                    title = title_el.get_text(strip=True) if title_el else ""
                    price_text = price_el.get_text(strip=True) if price_el else ""
                    price = 0
                    m = re.search(r"[\d,]+", price_text)
                    if m:
                        price = int(m.group().replace(",", ""))
                    if title:
                        results.append({"title": title, "price": price, "source": "brain"})
    except Exception as e:
        print(f"Brain scrape error: {e}")
    return results

async def get_market_research() -> dict:
    """
    Fetch real-time market data and return structured research.
    Falls back to curated data if scraping fails.
    """
    note_data, brain_data = await asyncio.gather(
        scrape_note_trending(20),
        scrape_brain_trending(10),
        return_exceptions=True,
    )

    note_items = note_data if isinstance(note_data, list) else []
    brain_items = brain_data if isinstance(brain_data, list) else []

    all_titles = [i["title"] for i in note_items + brain_items if i.get("title")]
    paid_prices = [i["price"] for i in note_items + brain_items if i.get("price", 0) > 0]
    avg_price = int(sum(paid_prices) / len(paid_prices)) if paid_prices else 500

    return {
        "note_trending": note_items[:10],
        "brain_trending": brain_items[:5],
        "all_titles": all_titles,
        "avg_price": avg_price,
        "total_scraped": len(all_titles),
        "scraped_ok": len(all_titles) > 0,
    }

FALLBACK_RESEARCH = {
    "note_trending": [
        {"title": "AIで副業を始めた私が最初の3ヶ月で月5万円稼いだ全手順", "price": 980, "source": "note"},
        {"title": "ChatGPTで稼ぐ人が絶対に教えない「情報商材の作り方」完全版", "price": 500, "source": "note"},
        {"title": "【完全自動化】Claudeを使ってnote記事を量産し月10万を達成した方法", "price": 1480, "source": "note"},
        {"title": "再現率98%｜AI副業初心者が3ステップで初収益を得るロードマップ", "price": 300, "source": "note"},
        {"title": "Geminiで「売れる情報商材」を30分で作る禁断のプロンプト全公開", "price": 2000, "source": "brain"},
    ],
    "avg_price": 700,
    "scraped_ok": False,
}
