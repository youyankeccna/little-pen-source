/**
 * 字帖类型
 */
export type WorkbookType = 
  | 'hanzi'      // 汉字
  | 'phrase'     // 词组
  | 'paragraph'  // 段落
  | 'pinyin'     // 拼音
  | 'number'     // 数字
  | 'english'    // 英文
  | 'control'    // 控笔

/**
 * 页面尺寸
 */
export type PageSize = 'A4' | 'A5' | 'B5' | 'custom'

/**
 * 方格类型
 */
export type GridType = 'tianzi' | 'mizi' | 'fangzheng' | 'hengxian' | 'blank'

/**
 * 字体
 */
export type FontFamily = 'default' | 'kaiti' | 'songti' | 'heiti'

/**
 * 布局配置
 */
export interface LayoutConfig {
  pageSize: PageSize
  gridType: GridType
  gridSize: number      // 方格大小
  lineSpacing: number   // 行间距
  pagePadding: number   // 页边距
}

/**
 * 字体配置
 */
export interface FontConfig {
  family: FontFamily
  size: number
  weight: number
  color: string
  offsetY: number
}

/**
 * 描红配置
 */
export interface TraceConfig {
  count: number         // 描红数量
  color: string         // 描红颜色
}

/**
 * 辅助配置
 */
export interface AssistConfig {
  showPinyin: boolean
  showStrokeOrder: boolean
  highlightFirst: boolean
}

/**
 * 主题配置
 */
export interface ThemeConfig {
  gridColor: string
  lineColor: string
}

/**
 * 字帖配置 Schema（统一结构）
 */
export interface WorkbookConfig {
  type: WorkbookType
  content: string
  title?: string
  layout: LayoutConfig
  font: FontConfig
  trace: TraceConfig
  assist: AssistConfig
  theme: ThemeConfig
}

/**
 * 字帖模板
 */
export interface WorkbookTemplate {
  id: string
  userId?: string
  name: string
  type: WorkbookType
  config: WorkbookConfig
  isFavorite: boolean
  sourceType: 'system' | 'user'
  createdAt: string
  updatedAt: string
}

/**
 * 生成记录
 */
export interface WorkbookHistory {
  id: string
  userId?: string
  type: WorkbookType
  config: WorkbookConfig
  exportUrl?: string
  status: 'pending' | 'success' | 'failed'
  createdAt: string
}

/**
 * 字帖类型元数据
 */
export interface WorkbookTypeMeta {
  type: WorkbookType
  name: string
  icon: string
  description: string
  color: string
}
