# imengine

A visual exploration tool for image similarity. Drop in an image and watch the graph surface related images — not as a ranked list, but as a spatial map of connections.

The idea is to model how associative memory works: one image leads to another by visual resemblance, forming a web you can wander through. There is no search bar, no pagination. You navigate by clicking.

## How it works

Every image is converted into a set of visual features using a vision transformer. These features are compared against every other image to find the closest matches. The result is a graph where similar images are placed near each other, connected by edges weighted by how close they are.

The frontend renders this graph on a canvas — each node is an image thumbnail. Clicking a node expands the graph with that image's nearest neighbors. Double-click for a full preview.

## Run it

You need Python 3 and Node.js.

```sh
# Terminal 1 – backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python index_images.py --folder ../images   # index the sample images
python main.py                              # starts on :8000
```

```sh
# Terminal 2 – frontend
cd frontend
npm install
npm run dev                                 # starts on :5173
```

Open `http://localhost:5173` in a browser. Press **R** to load a random image, or drop an image into the sidebar. Click any node to explore its neighbors.
