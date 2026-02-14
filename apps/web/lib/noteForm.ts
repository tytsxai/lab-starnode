import { getTopKeywordsFromNote, normalizeTags } from '@starnode/core'

export const TITLE_MAX_LENGTH = 80
export const TAG_MAX_COUNT = 10

export interface NoteInput {
  title: string
  content: string
  tagsRaw: string
}

export function parseTags(tagsRaw: string): string[] {
  return normalizeTags(tagsRaw)
}

export function validateNoteInput(input: NoteInput): { valid: boolean; message: string } {
  const title = input.title.trim()
  const content = input.content.trim()
  const tags = parseTags(input.tagsRaw)

  if (!title && !content) {
    return { valid: false, message: '标题和内容不能同时为空。' }
  }
  if (input.title.length > TITLE_MAX_LENGTH) {
    return { valid: false, message: `标题过长，最多 ${TITLE_MAX_LENGTH} 个字符。` }
  }
  if (tags.length > TAG_MAX_COUNT) {
    return { valid: false, message: `标签过多，最多 ${TAG_MAX_COUNT} 个。` }
  }

  return { valid: true, message: '' }
}

export function getKeywordPreview(input: Pick<NoteInput, 'title' | 'content'>, topK = 6): string[] {
  return getTopKeywordsFromNote(input, topK)
}
