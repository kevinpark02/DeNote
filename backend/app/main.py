from fastapi import FastAPI

app = FastAPI(title="DeNote API")


@app.get("/api/health")
async def health() -> dict[str, bool]:
    return {"ok": True}
