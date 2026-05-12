export interface ImageData {
  id: string
  filename: string
  image_path: string
  image_data: string | null
}

export interface ImageResult {
  id: string
  score: number
  filename: string
  image_path: string
  image_data: string | null
}

export interface UploadResponse {
  id: string
  filename: string
  image_data: string
  neighbors: ImageResult[]
}

export interface GraphNode {
  id: string
  filename: string
  imageData: string
  score?: number
  x?: number
  y?: number
  vx?: number
  vy?: number
}

export interface GraphLink {
  source: string
  target: string
  score: number
}
