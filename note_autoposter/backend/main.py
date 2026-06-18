"""
FastAPI backend for note autoposter.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import (
    init_db, save_article, update_article, get_article,
    list_articles, save_schedule, list_schedules, delete_schedule,
)
from content_gen import generate_article_from_scratch, generate_article_idea
from thumbnail import generate_thumbnail
from note_poster import post_to_note
from scheduler import get_scheduler, start_scheduler, stop_scheduler, add_schedule, remove_schedule

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
THUMBNAILS_DIR = Path(__file__).parent.parent / "thumbnails"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    schedules = await list_schedules()
    for s in schedules:
        if s["enabled"]:
            add_schedule(s["id"], s["cron_expr"], s["topic"] or "", s["price"])
    yield
    stop_scheduler()

app = FastAPI(title="Note Autoposter", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/thumbnails", StaticFiles(directory=str(THUMBNAILS_DIR)), name="thumbnails")


# ── Models ──────────────────────────────────────────────

class GenerateRequest(BaseModel):
    topic: str = ""
    price: int = 500

class ArticleUpdateRequest(BaseModel):
    title: str | None = None
    free_content: str | None = None
    paid_content: str | None = None
    price: int | None = None
    thumbnail_copy: str | None = None
    thumbnail_sub: str | None = None

class PostRequest(BaseModel):
    article_id: int
    scheduled_at: str | None = None

class ScheduleRequest(BaseModel):
    cron_expr: str = "0 8 * * 1"
    topic: str = ""
    price: int = 500

class ThumbnailRequest(BaseModel):
    article_id: int
    main_copy: str
    sub_copy: str = ""
    scheme_index: int = -1


# ── Article endpoints ───────────────────────────────────

@app.get("/api/articles")
async def api_list_articles():
    return await list_articles()

@app.get("/api/articles/{article_id}")
async def api_get_article(article_id: int):
    a = await get_article(article_id)
    if not a:
        raise HTTPException(404, "Article not found")
    return a

@app.post("/api/articles/generate")
async def api_generate_article(req: GenerateRequest, background_tasks: BackgroundTasks):
    article_id = await save_article({
        "title": "生成中...",
        "status": "generating",
        "price": req.price,
    })

    async def _gen():
        try:
            article = generate_article_from_scratch(req.topic, req.price)
            thumb_path = generate_thumbnail(
                article.get("thumbnail_copy", article["title"][:18]),
                article.get("thumbnail_sub", ""),
            )
            await update_article(article_id, {
                "title": article["title"],
                "free_content": article["free_content"],
                "paid_content": article["paid_content"],
                "price": article["price"],
                "thumbnail_path": thumb_path,
                "status": "draft",
                "metadata": __import__("json").dumps(article.get("metadata", {}), ensure_ascii=False),
            })
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            await update_article(article_id, {"status": "error", "free_content": str(e)})

    background_tasks.add_task(_gen)
    return {"article_id": article_id, "status": "generating"}

@app.put("/api/articles/{article_id}")
async def api_update_article(article_id: int, req: ArticleUpdateRequest):
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    await update_article(article_id, updates)
    return await get_article(article_id)

@app.post("/api/articles/{article_id}/thumbnail")
async def api_regenerate_thumbnail(article_id: int, req: ThumbnailRequest):
    a = await get_article(article_id)
    if not a:
        raise HTTPException(404, "Article not found")
    thumb_path = generate_thumbnail(req.main_copy, req.sub_copy, scheme_index=req.scheme_index)
    await update_article(article_id, {"thumbnail_path": thumb_path})
    return {"thumbnail_path": thumb_path}

@app.post("/api/articles/post")
async def api_post_article(req: PostRequest, background_tasks: BackgroundTasks):
    a = await get_article(req.article_id)
    if not a:
        raise HTTPException(404, "Article not found")

    await update_article(req.article_id, {"status": "posting"})

    async def _post():
        result = await post_to_note(
            title=a["title"],
            free_content=a["free_content"] or "",
            paid_content=a["paid_content"] or "",
            thumbnail_path=a["thumbnail_path"] or "",
            price=a["price"] or 0,
            scheduled_at=req.scheduled_at,
        )
        await update_article(req.article_id, {
            "status": "posted" if result["success"] else "failed",
            "note_url": result.get("url", ""),
            "posted_at": datetime.now().isoformat() if result["success"] else None,
            "free_content": a["free_content"] or "" + (f"\n\n[エラー: {result['error']}]" if result.get("error") else ""),
        })

    background_tasks.add_task(_post)
    return {"status": "posting"}

@app.get("/api/articles/{article_id}/status")
async def api_article_status(article_id: int):
    a = await get_article(article_id)
    if not a:
        raise HTTPException(404)
    return {"status": a["status"], "note_url": a.get("note_url", ""), "title": a["title"]}


# ── Schedule endpoints ──────────────────────────────────

@app.get("/api/schedules")
async def api_list_schedules():
    return await list_schedules()

@app.post("/api/schedules")
async def api_create_schedule(req: ScheduleRequest):
    sid = await save_schedule(req.model_dump())
    add_schedule(sid, req.cron_expr, req.topic, req.price)
    return {"id": sid}

@app.delete("/api/schedules/{schedule_id}")
async def api_delete_schedule(schedule_id: int):
    remove_schedule(schedule_id)
    await delete_schedule(schedule_id)
    return {"deleted": True}


# ── Thumbnail file serving ──────────────────────────────

@app.get("/api/thumbnail/{filename}")
async def serve_thumbnail(filename: str):
    path = THUMBNAILS_DIR / filename
    if not path.exists():
        raise HTTPException(404)
    return FileResponse(path)


# ── Frontend ────────────────────────────────────────────

@app.get("/")
async def serve_index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))

class SettingsRequest(BaseModel):
    env_content: str

@app.post("/api/settings")
async def api_save_settings(req: SettingsRequest):
    env_path = Path(__file__).parent.parent / ".env"
    existing = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                existing[k.strip()] = v.strip()
    for line in req.env_content.splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            existing[k.strip()] = v.strip()
    env_path.write_text("\n".join(f"{k}={v}" for k, v in existing.items()))
    return {"saved": True}

@app.get("/{path:path}")
async def serve_static(path: str):
    file_path = FRONTEND_DIR / path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    return FileResponse(str(FRONTEND_DIR / "index.html"))
