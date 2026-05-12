import type { ImageData, ImageResult, UploadResponse } from './types'

const BASE = 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}${body ? ': ' + body : ''}`)
  }
  return res.json()
}

export function fetchRandom(k = 30): Promise<{ images: ImageData[] }> {
  return request(`/api/random?k=${k}`)
}

export function uploadImage(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  return request('/api/upload', { method: 'POST', body: form })
}

export function searchSimilar(id: string, k = 5): Promise<{ results: ImageResult[] }> {
  return request(`/api/search/${id}?k=${k}`)
}

export function getImage(id: string): Promise<ImageData> {
  return request(`/api/image/${id}`)
}

export function getCount(): Promise<{ count: number }> {
  return request('/api/count')
}
