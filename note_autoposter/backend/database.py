import aiosqlite
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "articles.db"

async def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                free_content TEXT,
                paid_content TEXT,
                price INTEGER DEFAULT 0,
                thumbnail_path TEXT,
                status TEXT DEFAULT 'draft',
                note_url TEXT,
                scheduled_at TEXT,
                created_at TEXT NOT NULL,
                posted_at TEXT,
                metadata TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cron_expr TEXT NOT NULL,
                topic TEXT,
                price INTEGER DEFAULT 500,
                enabled INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                last_run TEXT
            )
        """)
        await db.commit()

async def save_article(data: dict) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("""
            INSERT INTO articles (title, free_content, paid_content, price, thumbnail_path, status, scheduled_at, created_at, metadata)
            VALUES (:title, :free_content, :paid_content, :price, :thumbnail_path, :status, :scheduled_at, :created_at, :metadata)
        """, {
            "title": data.get("title", ""),
            "free_content": data.get("free_content", ""),
            "paid_content": data.get("paid_content", ""),
            "price": data.get("price", 0),
            "thumbnail_path": data.get("thumbnail_path", ""),
            "status": data.get("status", "draft"),
            "scheduled_at": data.get("scheduled_at"),
            "created_at": datetime.now().isoformat(),
            "metadata": json.dumps(data.get("metadata", {}), ensure_ascii=False),
        })
        await db.commit()
        return cur.lastrowid

async def update_article(article_id: int, data: dict):
    fields = {k: v for k, v in data.items() if k not in ("id", "created_at")}
    if not fields:
        return
    set_clause = ", ".join(f"{k} = :{k}" for k in fields)
    fields["id"] = article_id
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE articles SET {set_clause} WHERE id = :id", fields)
        await db.commit()

async def get_article(article_id: int) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM articles WHERE id = ?", (article_id,)) as cur:
            row = await cur.fetchone()
            return dict(row) if row else None

async def list_articles(limit: int = 50) -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM articles ORDER BY created_at DESC LIMIT ?", (limit,)) as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

async def save_schedule(data: dict) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("""
            INSERT INTO schedules (cron_expr, topic, price, enabled, created_at)
            VALUES (:cron_expr, :topic, :price, :enabled, :created_at)
        """, {
            "cron_expr": data.get("cron_expr", "0 8 * * 1"),
            "topic": data.get("topic", ""),
            "price": data.get("price", 500),
            "enabled": 1,
            "created_at": datetime.now().isoformat(),
        })
        await db.commit()
        return cur.lastrowid

async def list_schedules() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM schedules ORDER BY created_at DESC") as cur:
            rows = await cur.fetchall()
            return [dict(r) for r in rows]

async def delete_schedule(schedule_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("DELETE FROM schedules WHERE id = ?", (schedule_id,))
        await db.commit()
