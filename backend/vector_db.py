import numpy as np
import json
import os
import uuid


class VectorDB:
    def __init__(self, data_file: str = "./vector_data.json"):
        self.data_file = data_file
        self.vectors = []
        self.metadata = []
        self._load()

    def _load(self):
        if os.path.exists(self.data_file):
            with open(self.data_file, "r") as f:
                data = json.load(f)
                self.vectors = [np.array(v) for v in data.get("vectors", [])]
                self.metadata = data.get("metadata", [])

    def _save(self):
        data = {
            "vectors": [v.tolist() for v in self.vectors],
            "metadata": self.metadata
        }
        with open(self.data_file, "w") as f:
            json.dump(data, f)

    def _cosine_similarity(self, v1: np.ndarray, v2: np.ndarray) -> float:
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return np.dot(v1, v2) / (norm1 * norm2)

    def upsert_image(self, vector, filename: str, image_path: str, image_id: str = None):
        point_id = image_id or str(uuid.uuid4())

        vector = np.array(vector)
        self.vectors.append(vector)
        self.metadata.append({
            "id": point_id,
            "filename": filename,
            "image_path": image_path
        })

        self._save()
        return point_id

    def search(self, vector, limit: int = 10):
        if not self.vectors:
            return []

        query_vec = np.array(vector)
        similarities = []

        for i, stored_vec in enumerate(self.vectors):
            sim = self._cosine_similarity(query_vec, stored_vec)
            similarities.append((sim, i))

        similarities.sort(reverse=True, key=lambda x: x[0])

        results = []
        for sim, idx in similarities[:limit]:
            results.append({
                "id": self.metadata[idx]["id"],
                "score": float(sim),
                "filename": self.metadata[idx]["filename"],
                "image_path": self.metadata[idx]["image_path"]
            })

        return results

    def get_by_id(self, image_id: str):
        for i, meta in enumerate(self.metadata):
            if meta["id"] == image_id:
                return {
                    "id": meta["id"],
                    "filename": meta["filename"],
                    "image_path": meta["image_path"]
                }
        return None

    def get_random(self, limit: int = 20):
        import random
        if not self.metadata:
            return []
        indices = random.sample(range(len(self.metadata)), min(limit, len(self.metadata)))
        return [self.metadata[i] for i in indices]

    def count(self):
        return len(self.vectors)