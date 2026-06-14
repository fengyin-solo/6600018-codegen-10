<template>
  <div class="flex h-screen">
    <!-- Left: Document list -->
    <div class="w-64 bg-gray-900 p-4 flex flex-col gap-3 border-r border-gray-800">
      <h1 class="text-lg font-bold text-amber-400">古籍 OCR 标注平台</h1>

      <div>
        <label class="block bg-amber-500 text-black text-center py-2 rounded cursor-pointer hover:bg-amber-400 text-sm font-medium">
          上传古籍图片
          <input type="file" accept="image/*" @change="onUpload" class="hidden" />
        </label>
      </div>

      <button @click="store.loadMockDocument()" class="bg-gray-800 py-2 rounded text-sm hover:bg-gray-700">
        加载示例文档
      </button>

      <!-- Search -->
      <div>
        <input v-model="store.searchQuery" @input="store.searchInDocuments(store.searchQuery)"
          placeholder="全文检索..." class="w-full bg-gray-800 rounded px-3 py-2 text-sm" />
        <div v-if="store.searchResults.length" class="mt-1 space-y-1">
          <div v-for="r in store.searchResults" :key="r.id" class="bg-gray-800 rounded p-1 text-xs">
            {{ r.text }} <span class="text-gray-500">{{ (r.confidence * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <!-- Document list -->
      <div class="flex-1 overflow-y-auto space-y-1">
        <div v-for="d in store.documents" :key="d.id" @click="store.currentDoc = d"
          class="bg-gray-800 rounded p-2 cursor-pointer text-sm"
          :class="store.currentDoc?.id === d.id ? 'ring-1 ring-amber-500' : ''">
          <div class="flex justify-between items-start">
            <span class="truncate">{{ d.name }}</span>
            <span v-if="store.getPendingNotesCountForDoc(d.id) > 0"
              class="bg-yellow-500 text-black text-xs px-1.5 py-0.5 rounded font-medium ml-2 flex-shrink-0">
              {{ store.getPendingNotesCountForDoc(d.id) }}
            </span>
          </div>
          <div class="text-xs text-gray-500">
            {{ d.results.length }} 行识别
            <span v-if="d.notes.length > 0" class="ml-2">{{ d.notes.length }} 条备注</span>
          </div>
        </div>
      </div>

      <!-- Export -->
      <button @click="doExport" class="bg-green-700 py-2 rounded text-sm hover:bg-green-600">
        导出 TEI/XML
      </button>
    </div>

    <!-- Center: Image + OCR overlay -->
    <div class="flex-1 relative bg-gray-950 overflow-hidden">
      <ImageCanvas v-if="store.currentDoc" />
      <div v-else class="flex items-center justify-center h-full text-gray-600">
        请上传古籍图片或加载示例文档
      </div>
    </div>

    <!-- Right: OCR results & annotations -->
    <div class="w-80 bg-gray-900 p-4 flex flex-col gap-3 border-l border-gray-800 overflow-y-auto">
      <div class="flex justify-between items-center">
        <h3 class="text-amber-300 font-bold text-sm">OCR 识别结果</h3>
        <span v-if="store.pendingNotesCount > 0" class="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded font-medium">
          {{ store.pendingNotesCount }} 待跟进
        </span>
      </div>
      <div v-if="store.currentDoc" class="space-y-2">
        <div v-for="r in store.currentDoc.results" :key="r.id"
          class="bg-gray-800 rounded p-2 text-sm"
          :class="hasPendingNote(r.id) ? 'ring-1 ring-yellow-500' : ''">
          <div class="flex justify-between">
            <span class="text-white font-medium">{{ r.text }}</span>
            <span class="text-xs px-2 py-0.5 rounded"
              :class="r.confidence > 0.9 ? 'bg-green-900 text-green-400' : 'bg-yellow-900 text-yellow-400'">
              {{ (r.confidence * 100).toFixed(0) }}%
            </span>
          </div>
          <div class="text-xs text-gray-400 mt-1">
            简体: {{ store.convertVariant(r.text) }}
          </div>
          <input v-model="r.corrected" placeholder="人工校正..."
            class="w-full bg-gray-700 rounded px-2 py-1 text-xs mt-1" />
          <div class="flex items-center justify-between mt-2">
            <div class="flex items-center gap-1">
              <span v-if="getResultNoteCount(r.id) > 0" class="text-xs text-amber-400">
                {{ getResultNoteCount(r.id) }} 条备注
              </span>
              <span v-if="getResultPendingNoteCount(r.id) > 0" class="text-xs text-yellow-400">
                ({{ getResultPendingNoteCount(r.id) }} 待处理)
              </span>
            </div>
            <button @click="openNoteModal(r.id, r.text)"
              class="text-xs bg-amber-600 hover:bg-amber-500 px-2 py-1 rounded text-white">
              备注
            </button>
          </div>
        </div>
      </div>

      <h3 class="text-amber-300 font-bold text-sm mt-4">标注列表</h3>
      <div v-if="store.currentDoc" class="space-y-1">
        <div v-for="a in store.currentDoc.annotations" :key="a.id"
          class="bg-gray-800 rounded p-2 text-xs flex justify-between">
          <span>[{{ a.type }}] {{ a.label }}: {{ a.content }}</span>
          <button @click="store.removeAnnotation(a.id)" class="text-red-400 hover:underline">删除</button>
        </div>
        <div v-if="!store.currentDoc.annotations.length" class="text-gray-600 text-xs">
          在图片上拖拽框选区域添加标注
        </div>
      </div>
    </div>

    <NoteModal
      :visible="noteModalVisible"
      :result-id="noteModalResultId"
      :result-text="noteModalResultText"
      @close="noteModalVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useOcrStore } from './store/ocr'
import ImageCanvas from './components/ImageCanvas.vue'
import NoteModal from './components/NoteModal.vue'

const store = useOcrStore()

const noteModalVisible = ref(false)
const noteModalResultId = ref('')
const noteModalResultText = ref('')

function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) store.uploadAndOCR(file)
}

function doExport() {
  const tei = store.exportTEI()
  if (!tei) return
  const blob = new Blob([tei], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.currentDoc?.name || 'export'}.xml`
  a.click()
  URL.revokeObjectURL(url)
}

function openNoteModal(resultId: string, resultText: string) {
  noteModalResultId.value = resultId
  noteModalResultText.value = resultText
  noteModalVisible.value = true
}

function getResultNoteCount(resultId: string) {
  return store.getNotesForResult(resultId).length
}

function getResultPendingNoteCount(resultId: string) {
  return store.getNotesForResult(resultId).filter(n => n.status === 'pending').length
}

function hasPendingNote(resultId: string) {
  return getResultPendingNoteCount(resultId) > 0
}
</script>
