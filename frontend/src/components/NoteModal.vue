<template>
  <div v-if="visible" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" @click.self="close">
    <div class="bg-gray-900 rounded-lg w-[500px] max-h-[80vh] flex flex-col shadow-2xl border border-gray-700">
      <div class="flex justify-between items-center p-4 border-b border-gray-700">
        <h3 class="text-amber-400 font-bold text-base">协作备注</h3>
        <button @click="close" class="text-gray-400 hover:text-white text-xl leading-none">&times;</button>
      </div>

      <div class="p-4 border-b border-gray-700 bg-gray-800/50">
        <div class="text-sm text-gray-400 mb-1">引用文字</div>
        <div class="text-white font-medium bg-gray-800 rounded px-3 py-2">{{ resultText }}</div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div v-if="notes.length === 0" class="text-center text-gray-500 py-8 text-sm">
          暂无备注，添加第一条处理意见吧
        </div>
        <div v-for="note in notes" :key="note.id" class="bg-gray-800 rounded-lg p-3">
          <div class="flex justify-between items-start mb-2">
            <div class="flex items-center gap-2">
              <span class="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{{ note.author }}</span>
              <span class="text-xs text-gray-500">{{ formatDate(note.createdAt) }}</span>
            </div>
            <span class="text-xs px-2 py-0.5 rounded font-medium" :class="statusClass(note.status)">
              {{ statusText(note.status) }}
            </span>
          </div>
          <p class="text-gray-200 text-sm mb-2 whitespace-pre-wrap">{{ note.comment }}</p>
          <div v-if="note.status !== 'pending'" class="text-xs text-gray-500 border-t border-gray-700 pt-2 mt-2">
            {{ note.resolver }} 于 {{ formatDate(note.resolvedAt!) }} {{ note.status === 'resolved' ? '标记已解决' : '标记已拒绝' }}
          </div>
          <div v-if="note.status === 'pending'" class="flex gap-2 mt-2">
            <button @click="resolveNote(note.id)" class="text-xs bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-white">
              标记解决
            </button>
            <button @click="rejectNote(note.id)" class="text-xs bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-white">
              标记拒绝
            </button>
            <button @click="deleteNote(note.id)" class="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-gray-300">
              删除
            </button>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-700">
        <textarea v-model="newComment" placeholder="输入处理意见..." rows="3"
          class="w-full bg-gray-800 rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-amber-500" />
        <div class="flex justify-end mt-2">
          <button @click="addNote" :disabled="!newComment.trim()"
            class="bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-black px-4 py-2 rounded text-sm font-medium">
            添加备注
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOcrStore } from '../store/ocr'
import type { NoteStatus } from '../types'

const props = defineProps<{
  visible: boolean
  resultId: string
  resultText: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useOcrStore()
const newComment = ref('')

const notes = computed(() => store.getNotesForResult(props.resultId))

function statusClass(status: NoteStatus) {
  switch (status) {
    case 'pending': return 'bg-yellow-900 text-yellow-400'
    case 'resolved': return 'bg-green-900 text-green-400'
    case 'rejected': return 'bg-red-900 text-red-400'
  }
}

function statusText(status: NoteStatus) {
  switch (status) {
    case 'pending': return '待处理'
    case 'resolved': return '已解决'
    case 'rejected': return '已拒绝'
  }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function addNote() {
  if (!newComment.value.trim()) return
  store.addNote(props.resultId, props.resultText, newComment.value.trim())
  newComment.value = ''
}

function resolveNote(noteId: string) {
  store.updateNoteStatus(noteId, 'resolved')
}

function rejectNote(noteId: string) {
  store.updateNoteStatus(noteId, 'rejected')
}

function deleteNote(noteId: string) {
  if (confirm('确定删除这条备注吗？')) {
    store.removeNote(noteId)
  }
}

function close() {
  newComment.value = ''
  emit('close')
}
</script>
