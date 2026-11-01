import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { workbookApi, templateApi, historyApi } from '@/services'
import type { 
  WorkbookType, WorkbookConfig, WorkbookTemplate, WorkbookHistory,
  LayoutConfig, FontConfig, TraceConfig, AssistConfig, ThemeConfig
} from '@/types'

// 默认配置
const defaultLayout: LayoutConfig = {
  pageSize: 'A4',
  gridType: 'tianzi',
  gridSize: 64,
  lineSpacing: 12,
  pagePadding: 20
}

const defaultFont: FontConfig = {
  family: 'kaiti',
  size: 32,
  weight: 500,
  color: '#333333',
  offsetY: 0
}

const defaultTrace: TraceConfig = { count: 2, color: '#CFCFCF' }
const defaultAssist: AssistConfig = { showPinyin: true, showStrokeOrder: false, highlightFirst: false }
const defaultTheme: ThemeConfig = { gridColor: '#E5E5E5', lineColor: '#E5E5E5' }

// 创建默认配置
const createDefaultConfig = (): WorkbookConfig => ({
  type: 'hanzi',
  content: '',
  layout: { ...defaultLayout },
  font: { ...defaultFont },
  trace: { ...defaultTrace },
  assist: { ...defaultAssist },
  theme: { ...defaultTheme }
})

export const useWorkbookStore = defineStore('workbook', () => {
  // ============ State ============
  const currentType = ref<WorkbookType>('hanzi')
  const config = ref<WorkbookConfig>(createDefaultConfig())
  const templates = ref<WorkbookTemplate[]>([])
  const history = ref<WorkbookHistory[]>([])
  // The former persist option had no registered plugin; persist only editable local state.
  try {
    const saved = uni.getStorageSync('workbook-store')
    const value = typeof saved === 'string' ? JSON.parse(saved) : saved
    const types: WorkbookType[] = ['hanzi', 'phrase', 'paragraph', 'pinyin', 'number', 'english', 'control']
    if (value && types.includes(value.currentType) && value.config?.layout && value.config?.font && value.config?.trace && value.config?.assist && value.config?.theme && typeof value.config.content === 'string') {
      currentType.value = value.currentType
      config.value = { ...value.config, type: value.currentType }
    }
  } catch { /* Invalid local data falls back to defaults. */ }
  watch([currentType, config], () => {
    uni.setStorageSync('workbook-store', JSON.stringify({ currentType: currentType.value, config: config.value }))
  }, { deep: true })

  const exporting = ref(false)
  const exportTaskId = ref('')
  const exportProgress = ref(0)
  const exportError = ref('')

  // ============ Getters ============
  const isEmpty = computed(() => !config.value.content.trim())
  const charCount = computed(() => config.value.content.split('').filter(c => c.trim()).length)
  
  // 计算页数
  const pageCount = computed(() => {
    const chars = config.value.content.split('').filter(c => c.trim())
    const { gridSize, lineSpacing, pagePadding } = config.value.layout
    const pageWidth = 595 // A4 宽度
    const cols = Math.floor((pageWidth - pagePadding * 2) / (gridSize + lineSpacing))
    const rows = 10
    const cellsPerPage = cols * rows
    return Math.ceil(chars.length / cellsPerPage) || 1
  })

  // ============ Actions ============
  
  /**
   * 设置字帖类型
   */
  const setType = (type: WorkbookType) => {
    currentType.value = type
    config.value.type = type
  }

  /**
   * 设置内容
   */
  const setContent = (content: string) => {
    config.value.content = content
  }

  /**
   * 更新布局配置
   */
  const updateLayout = (layout: Partial<LayoutConfig>) => {
    config.value.layout = { ...config.value.layout, ...layout }
  }

  /**
   * 更新字体配置
   */
  const updateFont = (font: Partial<FontConfig>) => {
    config.value.font = { ...config.value.font, ...font }
  }

  /**
   * 更新描红配置
   */
  const updateTrace = (trace: Partial<TraceConfig>) => {
    config.value.trace = { ...config.value.trace, ...trace }
  }

  /**
   * 更新辅助配置
   */
  const updateAssist = (assist: Partial<AssistConfig>) => {
    config.value.assist = { ...config.value.assist, ...assist }
  }

  /**
   * 重置配置
   */
  const resetConfig = () => {
    config.value = createDefaultConfig()
    config.value.type = currentType.value
  }

  /**
   * 保存模板
   */
  const saveTemplate = async (name: string): Promise<void> => {
    try {
      const data = await templateApi.save(name, config.value)
      if (data.template) {
        templates.value.unshift(data.template)
      }
    } catch (error) {
      console.error('保存模板失败:', error)
      throw error
    }
  }

  /**
   * 获取模板列表
   */
  const fetchTemplates = async (sourceType?: 'system' | 'user'): Promise<any[]> => {
    try {
      const data = await templateApi.list(sourceType)
      templates.value = data.templates || []
      return data.templates
    } catch (error) {
      console.error('获取模板失败:', error)
      uni.showToast({ title: '获取模板失败', icon: 'none' })
      return []
    }
  }

  /**
   * 导出字帖
   */
  const exportWorkbook = async (exportType: 'image' | 'pdf' = 'image'): Promise<string> => {
    try {
      exporting.value = true
      exportProgress.value = 10
      exportError.value = ''
      
      const data = await workbookApi.export(config.value, exportType)
      exportTaskId.value = data.taskId
      exportProgress.value = 30
      
      return data.taskId
    } catch (error: any) {
      exportError.value = error.message || '导出失败'
      exporting.value = false
      throw error
    }
  }

  /**
   * 查询导出状态
   */
  const checkExportStatus = async (taskId: string): Promise<{
    status: string
    fileUrl?: string
    error?: string
  }> => {
    try {
      const data = await workbookApi.getExportStatus(taskId)
      
      if (data.status === 'success') {
        exporting.value = false
        exportProgress.value = 100
      } else if (data.status === 'failed') {
        exporting.value = false
        exportError.value = data.error || '导出失败'
      } else {
        // 处理中，增加进度
        exportProgress.value = Math.min(90, exportProgress.value + 15)
      }
      
      return data
    } catch (error: any) {
      exporting.value = false
      exportError.value = error.message
      throw error
    }
  }

  /**
   * 获取历史记录
   */
  const fetchHistory = async (): Promise<any[]> => {
    try {
      const data = await historyApi.list()
      history.value = data.list || []
      return data.list
    } catch (error) {
      console.error('获取历史失败:', error)
      return []
    }
  }

  /**
   * 删除历史记录
   */
  const deleteHistory = async (id: string): Promise<void> => {
    try {
      await historyApi.delete(id)
      history.value = history.value.filter(h => h.id !== id)
    } catch (error) {
      console.error('删除历史失败:', error)
      throw error
    }
  }

  /**
   * 从模板加载配置
   */
  const loadFromTemplate = (template: WorkbookTemplate) => {
    if (template.config) {
      config.value = { ...template.config }
      currentType.value = template.config.type || 'hanzi'
    }
  }

  /**
   * 从历史记录加载配置
   */
  const loadFromHistory = (historyItem: WorkbookHistory) => {
    if (historyItem.config) {
      config.value = { ...historyItem.config }
      currentType.value = historyItem.config.type || 'hanzi'
    }
  }

  return {
    // State
    currentType,
    config,
    templates,
    history,
    exporting,
    exportTaskId,
    exportProgress,
    exportError,
    // Getters
    isEmpty,
    charCount,
    pageCount,
    // Actions
    setType,
    setContent,
    updateLayout,
    updateFont,
    updateTrace,
    updateAssist,
    resetConfig,
    saveTemplate,
    fetchTemplates,
    exportWorkbook,
    checkExportStatus,
    fetchHistory,
    deleteHistory,
    loadFromTemplate,
    loadFromHistory
  }
})
