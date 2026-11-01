import type { WorkbookTemplate } from '@/types'
// services/api.ts - API 封装模块
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080'

interface ApiResponse<T = any> {
  code: number
  data: T
  message?: string
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string>
}

/**
 * 统一请求封装
 */
async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options
  
  // 构建 URL
  let fullUrl = `${API_BASE}${url}`
  if (params) {
    const queryString = new URLSearchParams(params).toString()
    fullUrl += `?${queryString}`
  }
  
  // 默认配置
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers
    },
    ...fetchOptions
  }
  
  try {
    const response = await fetch(fullUrl, config)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result: ApiResponse<T> = await response.json()
    
    // 业务错误处理
    if (result.code !== 0 && result.code !== 200) {
      throw new Error(result.message || '请求失败')
    }
    
    return result.data
  } catch (error) {
    console.error(`[API Error] ${url}:`, error)
    throw error
  }
}

/**
 * API 方法封装
 */
export const api = {
  get: <T>(url: string, params?: Record<string, string>) => 
    request<T>(url, { method: 'GET', params }),
    
  post: <T>(url: string, data: any) => 
    request<T>(url, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
    
  put: <T>(url: string, data: any) => 
    request<T>(url, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
    
  delete: <T>(url: string) => 
    request<T>(url, { method: 'DELETE' })
}

/**
 * 字帖相关 API
 */
export const workbookApi = {
  // 导出字帖
  export: (config: any, exportType: 'image' | 'pdf' = 'image') => 
    api.post<{ taskId: string; status: string }>('/api/workbook/export', { config, exportType }),
  
  // 查询导出状态
  getExportStatus: (taskId: string) => 
    api.get<{
      taskId: string
      status: 'pending' | 'processing' | 'success' | 'failed'
      fileUrl?: string
      error?: string
    }>(`/api/workbook/export/${taskId}`),
  
  // 预览数据
  preview: (config: any) => 
    api.post('/api/workbook/preview', { config })
}

/**
 * 模板相关 API
 */
export const templateApi = {
  // 获取模板列表
  list: (sourceType?: 'system' | 'user') => 
    api.get<{ templates: any[] }>('/api/template/list', sourceType ? { sourceType } : undefined),
  
  // 保存模板
  save: (name: string, config: any) => 
    api.post<{ template: WorkbookTemplate }>('/api/template/save', { name, config }),
  
  // 收藏模板
  favorite: (id: string) => 
    api.post(`/api/template/favorite/${id}`, {})
}

/**
 * 历史记录 API
 */
export const historyApi = {
  // 获取历史列表
  list: () => api.get<{ list: any[] }>('/api/history/list'),
  
  // 删除历史
  delete: (id: string) => api.delete(`/api/history/${id}`)
}

/**
 * 打卡相关 API
 */
export const checkinApi = {
  // 打卡
  checkin: () => api.post('/api/checkin', {}),
  
  // 获取连续天数
  streak: () => api.get<{ streak: number }>('/api/checkin/streak'),
  
  // 创建计划
  createPlan: (plan: any) => api.post('/api/plan', plan)
}

/**
 * AI 评估 API
 */
export const aiApi = {
  // 上传练习
  upload: (filePath: string) => {
    // 文件上传需要特殊处理
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: `${API_BASE}/api/practice/upload`,
        filePath,
        name: 'file',
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(res.data))
          } else {
            reject(new Error(`上传失败: ${res.statusCode}`))
          }
        },
        fail: reject
      })
    })
  },
  
  // AI 评估
  evaluate: (practiceId: string) => 
    api.post('/api/ai/evaluate', { practiceId })
}

export default api
