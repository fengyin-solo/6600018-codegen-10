export interface OCRResult {
  id: string
  text: string
  bbox: [number, number, number, number]
  confidence: number
  corrected?: string
}

export interface Document {
  id: string
  name: string
  imageUrl: string
  results: OCRResult[]
  annotations: Annotation[]
  notes: CollaborationNote[]
  createdAt: string
}

export interface Annotation {
  id: string
  type: 'region' | 'character' | 'note'
  bbox: [number, number, number, number]
  label: string
  content: string
}

export type NoteStatus = 'pending' | 'resolved' | 'rejected'

export interface CollaborationNote {
  id: string
  resultId: string
  text: string
  comment: string
  author: string
  status: NoteStatus
  createdAt: string
  resolvedAt?: string
  resolver?: string
}

export interface VariantChar {
  ancient: string
  modern: string
  frequency: number
}
