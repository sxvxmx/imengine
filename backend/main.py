import base64
import os
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import io
from PIL import Image

from embedder import Embedder
from vector_db import VectorDB


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

embedder = Embedder()
db = VectorDB()

UPLOAD_DIR = Path("uploaded_images")
UPLOAD_DIR.mkdir(exist_ok=True)


class SearchResponse(BaseModel):
    results: list[dict]


class ImageMetadata(BaseModel):
    id: str
    filename: str
    image_path: str
    image_data: Optional[str] = None


@app.get("/api/random")
def get_random_images(k: int = 20):
    results = db.get_random(limit=k)
    for r in results:
        if r.get("image_path"):
            img_path = Path(r["image_path"])
            if img_path.exists():
                with open(img_path, "rb") as f:
                    r["image_data"] = base64.b64encode(f.read()).decode()
    return {"images": results}


@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    contents = await file.read()

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    ext = Path(file.filename).suffix.lower()
    filename = f"{Path(file.filename).stem}{ext}"
    save_path = UPLOAD_DIR / filename

    with open(save_path, "wb") as f:
        f.write(contents)

    vector = embedder.embed_image(image)

    image_id = db.upsert_image(
        vector=vector,
        filename=filename,
        image_path=str(save_path)
    )

    neighbors = db.search(vector, limit=10)

    for n in neighbors:
        img_path = n.get("image_path", "")
        if img_path:
            p = Path(img_path)
            if p.exists():
                with open(p, "rb") as f:
                    n["image_data"] = base64.b64encode(f.read()).decode()

    with open(save_path, "rb") as f:
        uploaded_image_data = base64.b64encode(f.read()).decode()

    return {
        "id": image_id,
        "filename": filename,
        "image_data": uploaded_image_data,
        "neighbors": neighbors
    }


@app.get("/api/search/{image_id}")
def search_similar(image_id: str, k: int = 10):
    image_data = db.get_by_id(image_id)
    if not image_data:
        raise HTTPException(status_code=404, detail="Image not found")

    img_path = Path(image_data["image_path"])
    if not img_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")

    with open(img_path, "rb") as f:
        image = Image.open(f).convert("RGB")

    vector = embedder.embed_image(image)
    results = db.search(vector, limit=k)

    for r in results:
        img_path = Path(r.get("image_path", ""))
        if img_path.exists():
            with open(img_path, "rb") as f:
                r["image_data"] = base64.b64encode(f.read()).decode()

    return {"results": results}


@app.get("/api/image/{image_id}")
def get_image(image_id: str):
    image_data = db.get_by_id(image_id)
    if not image_data:
        raise HTTPException(status_code=404, detail="Image not found")

    img_path = Path(image_data["image_path"])
    image_data["image_data"] = None

    if img_path.exists():
        with open(img_path, "rb") as f:
            image_data["image_data"] = base64.b64encode(f.read()).decode()

    return image_data


@app.get("/api/count")
def get_count():
    return {"count": db.count()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)