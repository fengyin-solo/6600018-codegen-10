import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Document, OCRResult, Annotation, CollaborationNote, NoteStatus } from '../types'

export const useOcrStore = defineStore('ocr', () => {
  const documents = ref<Document[]>([])
  const currentDoc = ref<Document | null>(null)
  const isLoading = ref(false)
  const searchQuery = ref('')
  const searchResults = ref<OCRResult[]>([])
  const currentUser = ref('校对员')

  const MOCK_DOC: Document = {
    id: '1',
    name: '论语·学而篇',
    imageUrl: '',
    results: [
      { id: 'r1', text: '子曰', bbox: [50, 30, 80, 40], confidence: 0.95 },
      { id: 'r2', text: '学而', bbox: [50, 80, 80, 40], confidence: 0.88 },
      { id: 'r3', text: '时习之', bbox: [50, 130, 120, 40], confidence: 0.91 },
      { id: 'r4', text: '不亦说乎', bbox: [50, 180, 160, 40], confidence: 0.87 },
      { id: 'r5', text: '有朋', bbox: [200, 30, 80, 40], confidence: 0.93 },
      { id: 'r6', text: '自远方来', bbox: [200, 80, 160, 40], confidence: 0.85 },
      { id: 'r7', text: '不亦乐乎', bbox: [200, 130, 160, 40], confidence: 0.92 },
    ],
    annotations: [],
    notes: [],
    createdAt: '2025-01-15'
  }

  const VARIANT_DICT: Record<string, string> = {
    '説': '说', '學': '学', '習': '习', '遠': '远', '樂': '乐', '書': '书',
    '國': '国', '東': '东', '長': '长', '門': '门', '馬': '马', '鳥': '鸟',
    '風': '风', '雲': '云', '龍': '龙', '車': '车', '萬': '万', '見': '见',
  }

  const pendingNotesCount = computed(() => {
    if (!currentDoc.value) return 0
    return currentDoc.value.notes.filter(n => n.status === 'pending').length
  })

  function getPendingNotesCountForDoc(docId: string): number {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc) return 0
    return doc.notes.filter(n => n.status === 'pending').length
  }

  function getNotesForResult(resultId: string): CollaborationNote[] {
    if (!currentDoc.value) return []
    return currentDoc.value.notes.filter(n => n.resultId === resultId)
  }

  function loadMockDocument() {
    documents.value = [MOCK_DOC]
    currentDoc.value = MOCK_DOC
  }

  async function uploadAndOCR(file: File) {
    isLoading.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      const resp = await fetch('/api/ocr', { method: 'POST', body: formData })
      if (resp.ok) {
        const data = await resp.json()
        const doc: Document = {
          id: Date.now().toString(),
          name: file.name,
          imageUrl: URL.createObjectURL(file),
          results: data.results || [],
          annotations: [],
          notes: [],
          createdAt: new Date().toISOString()
        }
        documents.value.push(doc)
        currentDoc.value = doc
      }
    } catch {
      loadMockDocument()
    } finally {
      isLoading.value = false
    }
  }

  function addAnnotation(type: Annotation['type'], bbox: [number, number, number, number], label: string, content: string) {
    if (!currentDoc.value) return
    currentDoc.value.annotations.push({
      id: Date.now().toString(),
      type, bbox, label, content
    })
  }

  function removeAnnotation(id: string) {
    if (!currentDoc.value) return
    currentDoc.value.annotations = currentDoc.value.annotations.filter(a => a.id !== id)
  }

  function addNote(resultId: string, text: string, comment: string) {
    if (!currentDoc.value) return
    const note: CollaborationNote = {
      id: Date.now().toString(),
      resultId,
      text,
      comment,
      author: currentUser.value,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
    currentDoc.value.notes.push(note)
  }

  function updateNoteStatus(noteId: string, status: NoteStatus) {
    if (!currentDoc.value) return
    const note = currentDoc.value.notes.find(n => n.id === noteId)
    if (note) {
      note.status = status
      if (status !== 'pending') {
        note.resolvedAt = new Date().toISOString()
        note.resolver = currentUser.value
      }
    }
  }

  function removeNote(noteId: string) {
    if (!currentDoc.value) return
    currentDoc.value.notes = currentDoc.value.notes.filter(n => n.id !== noteId)
  }

  function convertVariant(text: string): string {
    return text.split('').map(c => VARIANT_DICT[c] || c).join('')
  }

  function searchInDocuments(query: string) {
    const q = query.toLowerCase()
    searchResults.value = documents.value.flatMap(d =>
      d.results.filter(r => r.text.includes(q) || (r.corrected || '').includes(q))
    )
  }

  function exportTEI(): string {
    if (!currentDoc.value) return ''
    let tei = '<?xml version="1.0" encoding="UTF-8"?>\n'
    tei += '<TEI xmlns="http://www.tei-c.org/ns/1.0">\n'
    tei += `  <teiHeader><fileDesc><titleStmt><title>${currentDoc.value.name}</title></titleStmt></fileDesc></teiHeader>\n`
    tei += '  <text><body>\n'
    for (const r of currentDoc.value.results) {
      tei += `    <seg type="line" xml:id="${r.id}" cert="${r.confidence}">${r.corrected || r.text}</seg>\n`
    }
    tei += '  </body></text>\n</TEI>'
    return tei
  }

  return {
    documents, currentDoc, isLoading, searchQuery, searchResults, currentUser, pendingNotesCount,
    loadMockDocument, uploadAndOCR, addAnnotation, removeAnnotation,
    addNote, updateNoteStatus, removeNote, getNotesForResult, getPendingNotesCountForDoc,
    convertVariant, searchInDocuments, exportTEI
  }
})
