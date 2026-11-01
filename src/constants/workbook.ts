import type { GridType, PageSize, FontFamily } from '@/types'
/**
 * 字帖类型元数据
 */
export const WORKBOOK_TYPES = [
  {
    type: 'hanzi' as const,
    name: '汉字',
    icon: '📝',
    description: '单字练习，支持描红、拼音、笔顺',
    color: '#07c160'
  },
  {
    type: 'phrase' as const,
    name: '词组',
    icon: '📚',
    description: '词语练习，适合成语、词组训练',
    color: '#1989fa'
  },
  {
    type: 'paragraph' as const,
    name: '段落',
    icon: '📖',
    description: '段落练习，适合短文、古诗',
    color: '#ff976a'
  },
  {
    type: 'pinyin' as const,
    name: '拼音',
    icon: '🔤',
    description: '拼音专项，声母韵母整体认读',
    color: '#ee0a24'
  },
  {
    type: 'number' as const,
    name: '数字',
    icon: '🔢',
    description: '数字描红，适合幼儿启蒙',
    color: '#7232dd'
  },
  {
    type: 'english' as const,
    name: '英文',
    icon: '🇬🇧',
    description: '英文字母、单词、句子练习',
    color: '#2db7f5'
  },
  {
    type: 'control' as const,
    name: '控笔',
    icon: '✏️',
    description: '控笔训练，图形描红',
    color: '#ff69b4'
  }
]

/**
 * 方格类型选项
 */
export const GRID_TYPES: { value: GridType; label: string }[] = [
  { value: 'tianzi', label: '田字格' },
  { value: 'mizi', label: '米字格' },
  { value: 'fangzheng', label: '方格' },
  { value: 'hengxian', label: '横线格' },
  { value: 'blank', label: '空白格' }
]

/**
 * 页面尺寸选项
 */
export const PAGE_SIZES: { value: PageSize; label: string }[] = [
  { value: 'A4', label: 'A4 (标准)' },
  { value: 'A5', label: 'A5 (便携)' },
  { value: 'B5', label: 'B5' }
]

/**
 * 字体选项
 */
export const FONT_FAMILIES: { value: FontFamily; label: string }[] = [
  { value: 'kaiti', label: '楷体' },
  { value: 'songti', label: '宋体' },
  { value: 'heiti', label: '黑体' },
  { value: 'default', label: '系统默认' }
]
