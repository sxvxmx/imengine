import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from embedder import Embedder
from vector_db import VectorDB


def index_images_folder(folder_path: str = "../images"):
    folder = Path(folder_path)

    if not folder.exists():
        print(f"Folder {folder} does not exist. Creating empty folder.")
        folder.mkdir(parents=True, exist_ok=True)
        print(f"Please put images in {folder.absolute()} and re-run this script.")
        return

    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
    image_files = [
        f for f in folder.rglob("*")
        if f.is_file() and f.suffix.lower() in image_extensions
    ]

    if not image_files:
        print(f"No images found in {folder} (including subfolders)")
        return

    print(f"Found {len(image_files)} images. Indexing...")

    embedder = Embedder()
    db = VectorDB()

    for i, image_path in enumerate(image_files):
        print(f"[{i+1}/{len(image_files)}] Indexing {image_path.name}...")

        try:
            vector = embedder.embed_image_path(str(image_path))
            db.upsert_image(
                vector=vector,
                filename=image_path.name,
                image_path=str(image_path.absolute())
            )
        except Exception as e:
            print(f"  Error indexing {image_path.name}: {e}")

    print(f"Done! Indexed {len(image_files)} images.")
    print(f"Total images in database: {db.count()}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Index images into Qdrant")
    parser.add_argument(
        "--folder",
        default="../images",
        help="Path to images folder (default: ../images)"
    )

    args = parser.parse_args()
    index_images_folder(args.folder)