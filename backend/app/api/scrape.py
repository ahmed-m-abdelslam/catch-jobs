from fastapi import APIRouter
import asyncio

router = APIRouter(prefix="/scrape", tags=["scrape"])

_scrape_running = False

@router.post("/trigger")
async def trigger_scrape():
    """Manually trigger a scrape cycle."""
    global _scrape_running
    if _scrape_running:
        return {"message": "Scrape already running"}
    
    _scrape_running = True
    
    async def run():
        global _scrape_running
        try:
            from app.tasks.scrape_tasks import _run_scrape
            result = await _run_scrape()
            return result
        finally:
            _scrape_running = False
    
    asyncio.create_task(run())
    return {"message": "Scrape started"}


@router.get("/status")
async def scrape_status():
    return {"running": _scrape_running}
