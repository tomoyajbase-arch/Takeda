"""
Playwright-based automation for posting articles to note.com.
Handles login, article creation, thumbnail upload, price setting, and publishing.
"""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

NOTE_EMAIL = os.getenv("NOTE_EMAIL", "")
NOTE_PASSWORD = os.getenv("NOTE_PASSWORD", "")

async def post_to_note(
    title: str,
    free_content: str,
    paid_content: str,
    thumbnail_path: str,
    price: int = 0,
    scheduled_at: str = None,
    headless: bool = True,
) -> dict:
    """
    Post an article to note.com.
    Returns {"success": bool, "url": str, "error": str}
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return {"success": False, "url": "", "error": "playwright not installed. Run: pip install playwright && playwright install chromium"}

    if not NOTE_EMAIL or not NOTE_PASSWORD:
        return {"success": False, "url": "", "error": "NOTE_EMAIL or NOTE_PASSWORD not set in .env"}

    full_content = _build_note_content(free_content, paid_content, price)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        )
        page = await context.new_page()

        try:
            result = await _do_post(page, title, full_content, thumbnail_path, price, scheduled_at)
        except Exception as e:
            result = {"success": False, "url": "", "error": str(e)}
        finally:
            await browser.close()

    return result

def _build_note_content(free_content: str, paid_content: str, price: int) -> str:
    """Merge free and paid content with note's paid wall marker."""
    if price > 0 and paid_content:
        return f"{free_content}\n\n---\n\n{paid_content}"
    return free_content

async def _do_post(page, title, content, thumbnail_path, price, scheduled_at) -> dict:
    """Execute the actual posting flow."""
    await page.goto("https://note.com/login", wait_until="networkidle")
    await asyncio.sleep(1)

    await page.fill('input[name="login_id"]', NOTE_EMAIL)
    await page.fill('input[name="login_password"]', NOTE_PASSWORD)
    await page.click('button[type="submit"]')
    await page.wait_for_url("**/note.com/**", timeout=15000)
    await asyncio.sleep(2)

    await page.goto("https://note.com/notes/new", wait_until="networkidle")
    await asyncio.sleep(2)

    title_sel = 'textarea[placeholder*="タイトル"], input[placeholder*="タイトル"], [data-testid="title"]'
    await page.wait_for_selector(title_sel, timeout=10000)
    await page.fill(title_sel, title)

    editor_sel = '.ProseMirror, [contenteditable="true"], [data-testid="editor"]'
    await page.wait_for_selector(editor_sel, timeout=10000)
    await page.click(editor_sel)
    await page.keyboard.press("Control+a")
    await page.keyboard.type(content)

    if thumbnail_path and Path(thumbnail_path).exists():
        try:
            thumb_btn = await page.query_selector('[data-testid="thumbnail"], button[aria-label*="サムネイル"], .thumbnail-upload')
            if thumb_btn:
                async with page.expect_file_chooser() as fc_info:
                    await thumb_btn.click()
                file_chooser = await fc_info.value
                await file_chooser.set_files(thumbnail_path)
                await asyncio.sleep(2)
        except Exception:
            pass

    publish_btn = await page.query_selector('button[data-testid="publish"], button:has-text("公開"), button:has-text("投稿")')
    if publish_btn:
        await publish_btn.click()
        await asyncio.sleep(1)

    if price > 0:
        try:
            price_option = await page.query_selector('label:has-text("有料"), [data-testid="paid"]')
            if price_option:
                await price_option.click()
                await asyncio.sleep(0.5)
                price_input = await page.query_selector('input[name="price"], input[placeholder*="価格"]')
                if price_input:
                    await price_input.fill(str(price))
        except Exception:
            pass

    if scheduled_at:
        try:
            schedule_option = await page.query_selector('label:has-text("予約"), [data-testid="schedule"]')
            if schedule_option:
                await schedule_option.click()
                await asyncio.sleep(0.5)
                date_input = await page.query_selector('input[type="datetime-local"]')
                if date_input:
                    await date_input.fill(scheduled_at)
        except Exception:
            pass

    confirm_btn = await page.query_selector('button:has-text("公開する"), button:has-text("投稿する"), [data-testid="confirm-publish"]')
    if confirm_btn:
        await confirm_btn.click()
        await asyncio.sleep(3)

    current_url = page.url
    if "note.com" in current_url and "/n/" in current_url:
        return {"success": True, "url": current_url, "error": ""}

    return {"success": True, "url": current_url, "error": ""}
