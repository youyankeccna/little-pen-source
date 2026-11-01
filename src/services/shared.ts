/** The live website contract. Never call the legacy prototype API here. */
export type Subject = 'cn' | 'math' | 'en'
export interface StudyContext { grade: number; subject: Subject; term: 'upper' | 'lower' }
export interface Child { id: string; name: string; preferences: Record<Subject, string> | null; studyContext: StudyContext | null; preferenceVersion: number }
export interface User { id: number; username: string; activeChildId: string; children: Child[] }
export interface Book { id: string; series: string; grade: number; subject: Subject; term: string; edition: string }
export interface Item { id: string; text: string; translation?: string; meaning?: string }
export interface Lesson { grade: number; subject: Subject; id: string; title: string; note?: string; reviewStatus: string; packs: { kind: string; items: Item[] }[] }
export interface Layout { context: { subject: string; grade: number; type: string; variant: string }; config: Record<string, unknown> | null; version: number }

let base = import.meta.env.VITE_SHARED_API_BASE || 'http://127.0.0.1:5178/api/v1'
// #ifdef H5
base = import.meta.env.VITE_SHARED_API_BASE || '/api/v1'
// #endif
base = base.replace(/\/$/, '')
const tokenKey = 'little-pen-mobile-session:' + base
export const hasSession = () => !!uni.getStorageSync(tokenKey)
export const clearSession = () => uni.removeStorageSync(tokenKey)
export function request<T>(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: unknown, childId?: string, extraHeaders: Record<string, string> = {}): Promise<T> {
  const token = uni.getStorageSync(tokenKey)
  return new Promise((resolve, reject) => uni.request({
    url: base + path, method, data: data as any, timeout: 15000,
    header: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(childId ? { 'X-Child-Id': childId } : {}), ...extraHeaders },
    success(response) {
      const body = response.data as { data?: T; error?: { message: string } }
      if (response.statusCode === 401 && token === uni.getStorageSync(tokenKey)) clearSession()
      if (response.statusCode >= 400) { reject(new Error(body.error?.message || '请求失败，请重试。')); return }
      if (!body || !('data' in body)) { reject(new Error('服务地址未连接到网站接口。')); return }
      resolve(body.data as T)
    },
    fail() { reject(new Error('暂时连接不上服务，请检查网络后重试。')) }
  }))
}
export async function login(username: string, password: string) {
  const result = await request<{ user: User; accessToken: string }>('/auth/mobile/login', 'POST', { username, password })
  uni.setStorageSync(tokenKey, result.accessToken)
  return result.user
}
export async function logout() {
  await request('/auth/logout', 'POST', {})
  clearSession()
}

export interface RenderJob { id: string; key: string; status: string; expiresAt: number; pages?: number; unsupported?: number; message?: string }
const jobHeaders = (job: RenderJob) => ({ 'X-Render-Key': job.key })
export async function renderWorksheet(data: unknown, childId?: string): Promise<RenderJob> {
  const job = await request<RenderJob>('/render-jobs', 'POST', data, childId)
  for (let i = 0; i < 180; i++) {
    const result = await request<RenderJob>('/render-jobs/' + job.id, 'GET', undefined, childId, jobHeaders(job))
    if (result.status === 'failed') throw new Error(result.message || '生成失败，请重试。')
    if (result.status === 'ready') return { ...job, ...result }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error('生成时间较长，请减少内容后重试。')
}
export const saveRendered = (job: RenderJob, childId: string) => request<{ snapshotId: string }>('/render-jobs/' + job.id + '/save', 'POST', {}, childId, jobHeaders(job))
export async function renderedFile(job: RenderJob, filename: string, childId?: string): Promise<string> {
  const token = uni.getStorageSync(tokenKey)
  const url = base + '/render-jobs/' + job.id + '/' + filename
  const header = { ...jobHeaders(job), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(childId ? { 'X-Child-Id': childId } : {}) }
  // #ifdef H5
  const response = await fetch(url, { headers: header })
  if (!response.ok) throw new Error('文件暂时无法读取，预览过期后请重新生成。')
  return URL.createObjectURL(await response.blob())
  // #endif
  // #ifndef H5
  return new Promise((resolve, reject) => uni.downloadFile({ url, header, timeout: 60000,
    success: result => result.statusCode === 200 ? resolve(result.tempFilePath) : reject(new Error('文件暂时无法读取，请重新生成。')),
    fail: () => reject(new Error('下载失败，请检查网络后重试。'))
  }))
  // #endif
}
export function releaseFile(path: string) {
  // #ifdef H5
  if (path.startsWith('blob:')) URL.revokeObjectURL(path)
  // #endif
}
export async function deliverFile(path: string, filename: string, png: boolean): Promise<void> {
  // #ifdef H5
  const link = document.createElement('a'); link.href = path; link.download = filename; document.body.append(link); link.click(); link.remove()
  return
  // #endif
  // #ifndef H5
  if (png) return new Promise((resolve, reject) => uni.saveImageToPhotosAlbum({ filePath: path, success: () => resolve(), fail: () => reject(new Error('图片未保存，请检查相册权限后重试。')) }))
  return new Promise((resolve, reject) => uni.openDocument({ filePath: path, fileType: 'pdf', showMenu: true, success: () => resolve(), fail: () => reject(new Error('PDF未能打开，请重新下载。')) }))
  // #endif
}

export const recordRenderedOutput = (job: RenderJob, childId: string, format: 'pdf' | 'png', page: number) => request('/render-jobs/' + job.id + '/output', 'POST', { format, page }, childId, jobHeaders(job))

export interface FamilyWork { id: string; date: string; title: string; kind: 'photo' | 'trace'; char?: string; deleted: boolean; createdAt: number; analysis?: { deviation: number; method: string; guideHash: string } }
export async function privateImage(path: string, childId: string): Promise<string> {
  const token = uni.getStorageSync(tokenKey)
  const header = { Authorization: 'Bearer ' + token, 'X-Child-Id': childId }
  // #ifdef H5
  const response = await fetch(base + path, { headers: header })
  if (!response.ok) throw new Error('作品暂时无法读取，请刷新后重试。')
  return URL.createObjectURL(await response.blob())
  // #endif
  // #ifndef H5
  return new Promise((resolve, reject) => uni.downloadFile({ url: base + path, header,
    success: result => result.statusCode === 200 ? resolve(result.tempFilePath) : reject(new Error('作品暂时无法读取。')),
    fail: () => reject(new Error('请检查网络后重试。'))
  }))
  // #endif
}
export async function pickWorkImage(): Promise<{ path: string; imageBase64: string }> {
  const selected = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => uni.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: resolve, fail: () => reject(new Error('未选择照片，可以稍后再上传。')) }))
  const path = selected.tempFilePaths[0]
  let imageBase64 = ''
  // #ifdef H5
  const bytes = new Uint8Array(await (await fetch(path)).arrayBuffer())
  if (bytes.length > 4 * 1024 * 1024) throw new Error('照片超过4 MiB，请压缩后再试。')
  let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  imageBase64 = btoa(binary)
  // #endif
  // #ifndef H5
  imageBase64 = await new Promise<string>((resolve, reject) => uni.getFileSystemManager().readFile({ filePath: path, encoding: 'base64', success: result => resolve(String(result.data)), fail: () => reject(new Error('照片无法读取，请重新选择。')) }))
  if (imageBase64.length > 6 * 1024 * 1024) throw new Error('照片超过4 MiB，请压缩后再试。')
  // #endif
  return { path, imageBase64 }
}

export async function register(username: string, password: string) {
  const result = await request<{ user: User; accessToken: string; recoveryCode: string }>('/auth/mobile/register', 'POST', { username, password })
  uni.setStorageSync(tokenKey, result.accessToken)
  return result
}
export async function recoverPassword(username: string, recoveryCode: string, newPassword: string, confirmPassword: string) {
  await request('/auth/mobile/reset-password', 'POST', { username, recoveryCode, newPassword, confirmPassword })
  clearSession()
}
