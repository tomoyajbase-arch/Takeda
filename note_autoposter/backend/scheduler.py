"""
APScheduler-based task scheduler for automated article creation and posting.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio
import logging

logger = logging.getLogger(__name__)
_scheduler = AsyncIOScheduler()
_active_jobs: dict[int, str] = {}

def get_scheduler() -> AsyncIOScheduler:
    return _scheduler

def start_scheduler():
    if not _scheduler.running:
        _scheduler.start()

def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)

async def _run_auto_post(topic: str, price: int):
    """Auto-generate and post an article."""
    from content_gen import generate_article_from_scratch
    from thumbnail import generate_thumbnail
    from note_poster import post_to_note
    from database import save_article, update_article

    logger.info(f"Auto-posting started: topic={topic}, price={price}")
    try:
        article = generate_article_from_scratch(topic, price)
        thumb_path = generate_thumbnail(
            article.get("thumbnail_copy", article["title"][:18]),
            article.get("thumbnail_sub", ""),
        )
        article_id = await save_article({
            **article,
            "thumbnail_path": thumb_path,
            "status": "posting",
        })
        result = await post_to_note(
            title=article["title"],
            free_content=article["free_content"],
            paid_content=article["paid_content"],
            thumbnail_path=thumb_path,
            price=price,
        )
        await update_article(article_id, {
            "status": "posted" if result["success"] else "failed",
            "note_url": result.get("url", ""),
            "posted_at": __import__("datetime").datetime.now().isoformat(),
        })
        logger.info(f"Auto-post done: {result}")
    except Exception as e:
        logger.error(f"Auto-post error: {e}")

def add_schedule(schedule_id: int, cron_expr: str, topic: str, price: int):
    """Add a cron job for automatic posting."""
    job_id = f"schedule_{schedule_id}"

    parts = cron_expr.split()
    if len(parts) == 5:
        minute, hour, day, month, day_of_week = parts
    else:
        minute, hour, day, month, day_of_week = "0", "8", "*", "*", "1"

    trigger = CronTrigger(
        minute=minute, hour=hour, day=day,
        month=month, day_of_week=day_of_week,
    )
    _scheduler.add_job(
        lambda: asyncio.create_task(_run_auto_post(topic, price)),
        trigger=trigger,
        id=job_id,
        replace_existing=True,
    )
    _active_jobs[schedule_id] = job_id
    logger.info(f"Schedule added: {job_id} cron={cron_expr}")

def remove_schedule(schedule_id: int):
    job_id = _active_jobs.pop(schedule_id, f"schedule_{schedule_id}")
    try:
        _scheduler.remove_job(job_id)
    except Exception:
        pass
