import torch
import timm
from PIL import Image
import io


class Embedder:
    def __init__(self, model_name: str = "vit_base_patch16_224"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = timm.create_model(model_name, pretrained=True, num_classes=0).to(self.device)
        self.model.eval()

        data_config = timm.data.resolve_model_data_config(self.model)
        self.transforms = timm.data.create_transform(**data_config, is_training=False)

    def embed_image(self, image: Image.Image) -> list[float]:
        img_tensor = self.transforms(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            output = self.model(img_tensor)
            if output.ndim == 3:
                output = output.mean(dim=1)
            embeddings = output.squeeze()

        embeddings = embeddings / embeddings.norm(dim=-1, keepdim=True)
        return embeddings.cpu().tolist()

    def embed_image_bytes(self, image_bytes: bytes) -> list[float]:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return self.embed_image(image)

    def embed_image_path(self, path: str) -> list[float]:
        image = Image.open(path).convert("RGB")
        return self.embed_image(image)