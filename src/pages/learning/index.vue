<script setup lang="ts">
import { ref, computed } from 'vue'
import WritingChallenge from '@/components/WritingChallenge.vue'
import WorksWall from '@/components/WorksWall.vue'
import { onShow } from '@dcloudio/uni-app'
import { request, login, register, recoverPassword, logout, hasSession, clearSession, renderWorksheet, renderedFile, deliverFile, releaseFile, saveRendered, recordRenderedOutput } from '@/services/shared'
import type { User, Book, Lesson, Layout, StudyContext, Subject, RenderJob } from '@/services/shared'

const challengeOpen = ref(false), challengeLesson = ref<string | undefined>()
function openChallenge(lessonId?: string) { challengeLesson.value = lessonId; challengeOpen.value = true; tab.value = 'today' }
const tab = ref('today'), busy = ref(false), error = ref(''), notice = ref('')
const user = ref<User | null>(null), username = ref(''), password = ref('')
const securityOpen = ref(false), securityPassword = ref('')
const authMode = ref<'login' | 'register' | 'recover'>('login'), confirmation = ref(''), recoveryInput = ref(''), recoveryCode = ref('')
async function renewRecovery() { await run(async () => { const result = await request<{ recoveryCode: string }>('/auth/recovery-code', 'POST', { password: securityPassword.value }); securityPassword.value = ''; securityOpen.value = false; recoveryCode.value = result.recoveryCode; notice.value = '已生成新恢复码，之前保存的恢复码已失效，请保存这一份。' }) }
function copyRecovery() { uni.setClipboardData({ data: recoveryCode.value }) }
function changeAuth(mode: 'login' | 'register' | 'recover') { authMode.value = mode; password.value = ''; confirmation.value = ''; recoveryInput.value = ''; error.value = ''; notice.value = '' }
const child = computed(() => user.value?.children.find(c => c.id === user.value?.activeChildId))
const context = ref<StudyContext>({ grade: 1, subject: 'cn', term: 'upper' })
const preferences = ref<Record<Subject, string>>({ cn: 'pep', math: 'pep', en: 'pep' })
const editions = ref<Record<string, string[][]>>({ cn: [['pep', '统编语文']], math: [['pep', '人教版'], ['bnu', '北师大版（待收录）'], ['sujiao', '苏教版（待收录）']], en: [['pep', '人教 PEP']] })
const books = ref<Book[]>([]), lessons = ref<Lesson[]>([]), lesson = ref<Lesson | null>(null)
const bookIndex = ref(0), kindIndex = ref(0), page = ref(0), layouts = ref<Layout[]>([])
const saved = ref<{ id: string; title: string; pages: number; favorite: boolean }[]>([])
const cursor = ref<{ lessonId: string; title?: string; kind: string; itemIds: string[] } | null>(null)
const savedPreview = ref<{ id: string; title?: string; config: { text: string } } | null>(null)
interface PlanDay { date: string; title: string; lessonId: string; kind: string; items: { id: string; text: string }[]; completed: boolean }
interface Plan { id: string; mode: string; days: PlanDay[] }
const plans = ref<Plan[]>([]), growth = ref<{ today: string; completedDates: string[] }>({ today: '', completedDates: [] })
const legacyDaily = ref<{ id: string; date: string; title: string; lessonId: string; kind: string; itemIds: string[]; completed: boolean } | null>(null)
const todayPlans = computed(() => plans.value.flatMap(p => p.days.map((day, index) => ({ planId: p.id, day, index }))).filter(r => r.day.date === growth.value.today))
const selectedIds = ref<string[]>([]), fillPage = ref(true), printSize = ref(10), printFont = ref('wenkai'), showPinyin = ref(false)
const job = ref<RenderJob | null>(null), previewPage = ref(0), previewImage = ref(''), previewOwner = ref<string | undefined>()
let loaded = false
const dailyLimit = computed(() => pack.value?.kind === 'words' ? 4 : pack.value?.kind === 'vocabulary' ? 6 : 8)
const canPlan = computed(() => ['characters','words','vocabulary','calculations','letters','patterns','digits'].includes(pack.value?.kind || ''))
function clearPreview() { if (previewImage.value) releaseFile(previewImage.value); previewImage.value = ''; job.value = null; previewPage.value = 0 }
function choosePack() {
  clearPreview(); page.value = 0
  selectedIds.value = (pack.value?.items || []).slice(0, canPlan.value ? dailyLimit.value : 10).map(i => i.id)
  const type = ['characters','extraCharacters'].includes(pack.value?.kind || '') ? 'hanzi' : ['words','extraWords'].includes(pack.value?.kind || '') ? 'cizu' : pack.value?.kind === 'vocabulary' ? 'word' : 'paragraph'
  const subject = lesson.value?.subject || context.value.subject, grade = lesson.value?.grade ?? context.value.grade
  const row = layouts.value.find(r => r.context.subject === subject && r.context.grade === grade && r.context.type === type && r.context.variant === (pack.value?.kind === 'calculations' ? 'vertical' : 'standard'))
  printSize.value = Number(row?.config?.size || (grade <= 2 ? 12 : 10)); showPinyin.value = subject === 'cn' && grade > 0 && grade <= 2 && ['hanzi','cizu'].includes(type)
}
function toggleOption(name: 'fillPage' | 'showPinyin', event: unknown) { const value = (event as { detail: { value: boolean } }).detail.value; if (name === 'fillPage') fillPage.value = value; else showPinyin.value = value; clearPreview() }
function selectVisible(values: string[]) {
  const visible = new Set(visibleItems.value.map(i => i.id))
  selectedIds.value = [...selectedIds.value.filter(id => !visible.has(id)), ...values]; clearPreview()
}
async function imagePage(index: number) {
  if (!job.value) return
  const next = await renderedFile(job.value, `preview-${index + 1}.png`, previewOwner.value)
  if (previewImage.value) releaseFile(previewImage.value)
  previewImage.value = next; previewPage.value = index
}
async function generate(snapshotId?: string) { await run(async () => {
  clearPreview(); previewOwner.value = user.value?.activeChildId
  const options = snapshotId ? { font: printFont.value } : { size: printSize.value, fillPage: fillPage.value, font: printFont.value, showPinyin: showPinyin.value }
  const data = snapshotId ? { snapshotId, options } : { lessonId: lesson.value?.id, kind: pack.value?.kind, itemIds: selectedIds.value, options }
  job.value = await renderWorksheet(data, previewOwner.value); await imagePage(0)
  if (!snapshotId && user.value && lesson.value && pack.value) {
    try { cursor.value = (await request<{ cursor: NonNullable<typeof cursor.value> }>('/learning/cursor', 'PUT', { lessonId: lesson.value.id, kind: pack.value.kind, itemIds: selectedIds.value }, previewOwner.value)).cursor } catch { notice.value = '字帖已生成；进度暂未同步，可继续导出。' }
  }
}) }
async function exportFile(png: boolean) { await run(async () => {
  if (!job.value) return
  const path = await renderedFile(job.value, png ? `page-${previewPage.value + 1}.png` : 'workbook.pdf', previewOwner.value)
  try { await deliverFile(path, png ? `字帖-第${previewPage.value + 1}页.png` : '练字字帖.pdf', png) } finally { setTimeout(() => releaseFile(path), 60000) }
  notice.value = png ? '图片已交付，请在下载文件或相册中查看。' : 'PDF 已交付，可保存后打印。下载不会自动计为完成。'
  if (user.value && child.value?.preferences) { try { await recordRenderedOutput(job.value, user.value.activeChildId, png ? 'png' : 'pdf', previewPage.value + 1) } catch { notice.value += ' 云端输出记录暂未同步，文件仍可使用。' } }
}) }
async function favoriteJob() { await run(async () => { if (!job.value || !user.value) return; await saveRendered(job.value, user.value.activeChildId); await loadPrivate(); notice.value = '已收藏，网站也能打开这份字帖。' }) }
async function makeDaily() { await run(async () => {
  if (!lesson.value || !pack.value || !user.value) return
  if (!selectedIds.value.length || selectedIds.value.length > dailyLimit.value) throw new Error(`今日练习请选择1–${dailyLimit.value}项素材。`)
  const result = await request<{ plan: Plan }>('/family/plans', 'POST', { mode: 'daily', days: [{ date: growth.value.today, lessonId: lesson.value.id, kind: pack.value.kind, itemIds: selectedIds.value }] }, user.value.activeChildId)
  const existing = plans.value.findIndex(p => p.id === result.plan.id); if (existing >= 0) plans.value.splice(existing, 1, result.plan); else plans.value.unshift(result.plan); notice.value = '已加入今日练习，完成后由家长确认。'
}) }
async function completePlan(planId: string, index: number, completed: boolean) { await run(async () => {
  await request('/family/plans/' + planId + '/completion', 'PUT', { day: index, completed }, user.value!.activeChildId); await loadPrivate()
}) }
async function completeLegacy(completed: boolean) { await run(async () => {
  await request('/learning/daily/completion', 'PUT', { id: legacyDaily.value?.id, date: legacyDaily.value?.date, completed }, user.value!.activeChildId); await loadPrivate()
}) }
async function openPlan(day: PlanDay) { await run(async () => {
  const result = await request<{ lesson: Lesson }>('/lessons/' + encodeURIComponent(day.lessonId) + '/practice'); await openLesson(result.lesson)
  kindIndex.value = Math.max(0, result.lesson.packs.findIndex(p => p.kind === day.kind)); choosePack(); selectedIds.value = day.items.map(i => i.id); tab.value = 'materials'
}) }
const editing = ref(false), size = ref(10), layoutVersion = ref(0)
const subjectNames = { cn: '语文', math: '数学', en: '英语' }
const materialSummary = computed(() => context.value.grade === 0 ? '幼儿园 · ' + subjectNames[books.value[bookIndex.value]?.subject || context.value.subject] + '启蒙' : summary.value)
const bookLabels = computed(() => books.value.map(b => b.grade === 0 ? subjectNames[b.subject] + '启蒙 · 自编活动' : b.edition))
const grades = computed(() => context.value.subject === 'en' ? [3, 4, 5, 6] : [0, 1, 2, 3, 4, 5, 6])
const gradeNames = computed(() => grades.value.map(g => g ? g + '年级' : '幼儿园'))
const kinds: Record<string, string> = { chineseTexts: '课文素材', extraCharacters: '补充生字', extraWords: '补充词语', extraSentences: '补充句子', extraTexts: '补充短文', poems: '古诗', englishExcerpts: '课文摘句', englishTexts: '主题短文', englishSentences: '主题句子', extraPhrases: '拓展短语', englishExcerptsBilingual: '课文摘句与翻译', englishTextsBilingual: '主题短文与翻译', englishSentencesBilingual: '主题句子与翻译', extraPhrasesBilingual: '拓展短语与翻译', patterns: '控笔', digits: '数字', letters: '字母', terms: '数学词语', characters: '生字', words: '词语', sentences: '句子', paragraphs: '课文段落', vocabulary: '单词', phrases: '短语', vocabularyBilingual: '单词与翻译', phrasesBilingual: '短语与翻译', sentencesBilingual: '句子与翻译', paragraphsBilingual: '课文与翻译', calculations: '计算练习', calculationAnswers: '计算答案', formulas: '公式' }
const pack = computed(() => lesson.value?.packs[kindIndex.value])
const visibleItems = computed(() => pack.value?.items.slice(page.value * 20, (page.value + 1) * 20) || [])
const summary = computed(() => `${context.value.grade ? context.value.grade + '年级' : '幼儿园'} · ${subjectNames[context.value.subject]}${context.value.grade ? ' · ' + (context.value.term === 'upper' ? '上册' : '下册') : ''}`)
const layoutContext = computed(() => ({ subject: context.value.subject, grade: context.value.grade, type: context.value.subject === 'cn' ? 'cizu' : context.value.subject === 'en' ? 'word' : 'paragraph', variant: context.value.subject === 'math' ? 'vertical' : 'standard' }))
function readLayout() {
  const c = layoutContext.value
  const row = layouts.value.find(r => Object.entries(c).every(([k, v]) => r.context[k as keyof typeof c] === v))
  size.value = Number(row?.config?.size || (c.grade <= 2 ? 12 : 10)); layoutVersion.value = row?.version || 0
}
async function run(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await action() } catch (e) { error.value = e instanceof Error ? e.message : '操作失败，请重试。'; if (!hasSession()) { recoveryCode.value = ''; securityPassword.value = ''; securityOpen.value = false; user.value = null; saved.value = []; layouts.value = []; cursor.value = null; savedPreview.value = null; plans.value = []; legacyDaily.value = null; growth.value = { today: '', completedDates: [] }; challengeOpen.value = false; clearPreview() } } finally { busy.value = false }
}
async function loadPrivate() {
  saved.value = []; layouts.value = []; cursor.value = null; savedPreview.value = null
  if (!user.value) return
  const id = user.value.activeChildId
  const [a, b, c, d, e] = await Promise.all([
    request<{ worksheets: typeof saved.value }>('/worksheet-snapshots', 'GET', undefined, id),
    request<{ layouts: Layout[] }>('/layout-preferences', 'GET', undefined, id),
    request<{ cursor: typeof cursor.value; dailyPlan: typeof legacyDaily.value }>('/learning', 'GET', undefined, id),
    request<{ plans: Plan[] }>('/family/plans', 'GET', undefined, id),
    request<typeof growth.value>('/family/growth', 'GET', undefined, id)
  ])
  saved.value = a.worksheets; layouts.value = b.layouts; cursor.value = c.cursor; legacyDaily.value = c.dailyPlan; plans.value = d.plans; growth.value = e; readLayout()
}
function restoreChild() {
  const guest = !user.value ? uni.getStorageSync('little-pen-mini-study') : null
  context.value = child.value?.studyContext ? { ...child.value.studyContext } : { grade: 1, subject: 'cn', term: 'upper' }
  preferences.value = child.value?.preferences ? { ...child.value.preferences } : { cn: 'pep', math: 'pep', en: 'pep' }
  if (guest?.context && ['cn','math','en'].includes(guest.context.subject) && Number.isInteger(guest.context.grade) && guest.context.grade >= 0 && guest.context.grade <= 6 && ['upper','lower'].includes(guest.context.term)) { context.value = { ...guest.context }; preferences.value = { ...preferences.value, ...guest.preferences } }
  if (context.value.subject === 'en' && context.value.grade < 3) context.value.grade = 3
}
async function loadBooks() {
  lesson.value = null; lessons.value = []; books.value = []; bookIndex.value = 0
  const c = context.value, series = preferences.value[c.subject]
  const query = c.grade === 0 ? '?grade=0' : `?grade=${c.grade}&subject=${c.subject}&term=${c.term}&series=${encodeURIComponent(series)}`
  const result = await request<{ books: Book[]; editionOptions: Record<string, string[][]> }>('/catalog/books' + query)
  if (result.editionOptions) editions.value = { ...editions.value, ...result.editionOptions }
  books.value = result.books
  const bank = books.value.findIndex(b => b.id.startsWith('bank-'))
  if (bank >= 0) bookIndex.value = bank
  else if (c.grade === 0) bookIndex.value = Math.max(0, books.value.findIndex(b => b.subject === c.subject))
  if (books.value.length) await loadLessons()
  readLayout()
}
async function loadLessons() {
  lesson.value = null; lessons.value = []
  const book = books.value[bookIndex.value]; if (!book) return
  lessons.value = (await request<{ lessons: Lesson[] }>('/books/' + encodeURIComponent(book.id) + '/lessons')).lessons
}
async function boot() {
  recoveryCode.value = ''; securityPassword.value = ''; securityOpen.value = false; authMode.value = 'login'
  challengeOpen.value = false
  clearPreview(); plans.value = []; legacyDaily.value = null; growth.value = { today: '', completedDates: [] }
  saved.value = []; layouts.value = []; cursor.value = null; savedPreview.value = null
  if (hasSession()) { user.value = (await request<{ user: User | null }>('/me')).user; if (!user.value) clearSession() }
  else user.value = null
  restoreChild(); await loadBooks(); await loadPrivate()
}
async function signIn() { await run(async () => {
  if (authMode.value !== 'login' && password.value !== confirmation.value) throw new Error('两次密码输入不一致，请再核对一下。')
  if (authMode.value === 'recover') {
    await recoverPassword(username.value, recoveryInput.value, password.value, confirmation.value); password.value = ''; confirmation.value = ''; recoveryInput.value = ''; authMode.value = 'login'; notice.value = '密码已更新，请使用新密码登录。旧恢复码已失效。'; return
  }
  if (authMode.value === 'register') { const result = await register(username.value, password.value); user.value = result.user; recoveryCode.value = result.recoveryCode }
  else user.value = await login(username.value, password.value)
  password.value = ''; confirmation.value = ''; challengeOpen.value = false; restoreChild(); await loadBooks(); await loadPrivate(); loaded = true
  tab.value = recoveryCode.value ? 'account' : 'today'; editing.value = !child.value?.preferences; notice.value = recoveryCode.value ? '账号已创建，请先保存恢复码，再设置学习信息。' : '已连接网站账号，学习信息已恢复。'
}) }
async function switchChild(index: number) { await run(async () => { saved.value = []; layouts.value = []; cursor.value = null; savedPreview.value = null; user.value = (await request<{ user: User }>('/family/active-child', 'PUT', { id: user.value!.children[index].id })).user; challengeOpen.value = false; clearPreview(); plans.value = []; legacyDaily.value = null; restoreChild(); await loadBooks(); await loadPrivate() }) }
async function openLesson(row: Lesson) { lesson.value = row; kindIndex.value = 0; page.value = 0; savedPreview.value = null; choosePack() }
async function resume() { await run(async () => { if (!cursor.value) return; const result = await request<{ lesson: Lesson }>('/lessons/' + encodeURIComponent(cursor.value.lessonId) + '/practice'); await openLesson(result.lesson); kindIndex.value = Math.max(0, result.lesson.packs.findIndex(p => p.kind === cursor.value?.kind)); choosePack(); selectedIds.value = [...cursor.value.itemIds]; const first = pack.value?.items.findIndex(i => i.id === cursor.value?.itemIds[0]) ?? 0; page.value = Math.floor(Math.max(0, first) / 20); tab.value = 'materials' }) }
async function saveSettings() { await run(async () => {
  if (!user.value) { await loadBooks(); uni.setStorageSync('little-pen-mini-study', { context: context.value, preferences: preferences.value }); editing.value = false; return }
  user.value = (await request<{ user: User }>('/me/preferences', 'PUT', { preferences: preferences.value, studyContext: context.value, version: child.value?.preferenceVersion }, user.value.activeChildId)).user
  challengeOpen.value = false; clearPreview(); await loadBooks(); editing.value = false; notice.value = '已保存到当前孩子，网站也会使用这些学习信息。'
}) }
async function saveLayout() { await run(async () => {
  const c = layoutContext.value, row = layouts.value.find(r => Object.entries(c).every(([k, v]) => r.context[k as keyof typeof c] === v))
  const result = await request<{ layout: Layout }>('/layout-preferences', 'PUT', { context: c, config: { ...row?.config, size: size.value }, version: layoutVersion.value }, user.value!.activeChildId)
  if (row) layouts.value.splice(layouts.value.indexOf(row), 1, result.layout); else layouts.value.push(result.layout)
  readLayout(); notice.value = '字号已同步。网站新建同类练习时会沿用，已有草稿保持原样。'
}) }
async function showSaved(id: string) { await run(async () => { savedPreview.value = (await request<{ snapshot: NonNullable<typeof savedPreview.value> }>('/worksheet-snapshots/' + id, 'GET', undefined, user.value!.activeChildId)).snapshot }) }
async function selectTab(value: string) { if (busy.value) return; if (editing.value && tab.value === 'account' && value !== 'account') { await run(async () => { restoreChild(); await loadBooks(); editing.value = false }); } tab.value = value }
function setSubject(value: Subject) { context.value.subject = value; if (value === 'en' && context.value.grade < 3) context.value.grade = 3 }
onShow(() => {
  if (!loaded) { run(async () => { await boot(); loaded = true }); return }
  if (user.value) run(async () => {
    const next = (await request<{ user: User | null }>('/me')).user
    if (!next || next.id !== user.value?.id || next.activeChildId !== user.value.activeChildId) { await boot(); notice.value = '已重新读取当前账号和孩子信息。'; return }
    user.value = next; await loadPrivate()
    if (!job.value && !lesson.value && !editing.value) { restoreChild(); await loadBooks() }
  })
})
</script>

<template>
  <view class="page">
    <view class="brand"><text class="brand-mark">小小笔尖</text><text class="muted">每天写一点，进步看得见</text></view>
    <view class="tabs"><button v-for="entry in [['today','今日练习'],['materials','素材库'],['growth','成长'],['account','我的']]" :key="entry[0]" :class="{ selected: tab === entry[0] }" :disabled="busy" @tap="selectTab(entry[0])">{{ entry[1] }}</button></view>
    <view v-if="busy" class="feedback">正在读取或生成字帖，请稍候…</view>
    <view v-if="error" class="feedback error"><text>{{ error }}</text><button v-if="user || tab !== 'account'" :disabled="busy" @tap="run(boot)">重新读取</button></view>
    <view v-if="notice" class="feedback">{{ notice }}</view>

    <view v-if="tab === 'today'">
      <view class="hero card"><text class="eyebrow">{{ child?.name || '欢迎来练字' }}</text><text class="heading">今天，从一笔开始</text><text class="muted">{{ summary }}</text><button class="primary" :disabled="busy" @tap="cursor ? resume() : tab = 'materials'">{{ cursor ? '继续上次的练习' : '选一份练习素材' }}</button><button class="text-button" :disabled="busy" @tap="tab = 'account'; editing = true">修改学习信息</button></view>
      <view class="card"><text class="title">把练字变成一场小闯关</text><text class="muted">沿着参考线写好一个字，点亮一颗星星。写满一行，让小花开起来。</text><button class="primary" :disabled="busy" @tap="openChallenge()">开始汉字闯关</button></view>
      <view v-if="challengeOpen" class="card"><WritingChallenge :key="(user ? user.id + ':' + user.activeChildId : 'guest') + ':' + context.grade + ':' + context.term + ':' + preferences.cn + ':' + growth.today + ':' + (challengeLesson || '')" :owner="user ? user.id + ':' + user.activeChildId : 'guest'" :child-id="user?.activeChildId" :grade="context.grade" :term="context.term" :series="preferences.cn" :lesson-id="challengeLesson" @saved="run(loadPrivate)" /><button class="text-button" @tap="challengeOpen = false">收起闯关</button></view>
      <view v-if="user" class="card"><text class="title">今日安排 · 家长已确认 {{ growth.completedDates.length }} 天</text><text v-if="!todayPlans.length && !legacyDaily" class="muted">从素材库选少量内容，加入今日练习。</text><view v-for="row in todayPlans" :key="row.planId + row.index" class="daily-row"><text>{{ row.day.title }} · {{ row.day.completed ? '已完成' : '待练习' }}</text><button :disabled="busy" @tap="openPlan(row.day)">打开练习内容</button><button :disabled="busy" @tap="completePlan(row.planId, row.index, !row.day.completed)">{{ row.day.completed ? '撤销完成' : '家长确认完成' }}</button></view><view v-if="legacyDaily" class="daily-row"><text>{{ legacyDaily.title }} · {{ legacyDaily.completed ? '已完成' : '待练习' }}</text><button :disabled="busy" @tap="completeLegacy(!legacyDaily.completed)">{{ legacyDaily.completed ? '撤销完成' : '家长确认完成' }}</button></view><text class="muted">下载和打印不会自动计为完成，同一天重复确认只计一天。</text></view>
      <view class="card"><text class="title">最近保存的字帖</text><text v-if="!user" class="muted">登录网站账号，找回收藏和孩子的学习进度。</text><text v-else-if="!saved.length" class="muted">还没有保存字帖。在网站收藏后，这里会同步出现。</text><button v-for="row in saved.slice(0, 5)" :key="row.id" class="list-button" :disabled="busy" @tap="showSaved(row.id)">{{ row.title }} · {{ row.pages }} 页{{ row.favorite ? ' · 已收藏' : '' }}</button></view>
      <view v-if="savedPreview" class="card"><text class="title">{{ savedPreview.title || '已保存的字帖' }}</text><text class="content">{{ savedPreview.config.text }}</text><text class="muted">使用当前选定的内置字体生成预览，原收藏保留。</text><button class="primary" :disabled="busy" @tap="generate(savedPreview.id)">生成收藏的 A4 预览</button></view>
    </view>

    <view v-if="tab === 'materials'">
      <view class="card"><text class="title">{{ materialSummary }}</text><text class="muted">{{ context.grade === 0 ? '幼儿自编启蒙活动，不分上下册，可选择汉字、数字和字母。' : user ? '沿用当前孩子的学习信息' : '游客可直接浏览，默认人教版' }}</text><button class="text-button" :disabled="busy" @tap="tab = 'account'; editing = true">换教材 / 年级 / 册次</button>
        <picker v-if="books.length" :disabled="busy" :range="bookLabels" :value="bookIndex" @change="bookIndex = Number($event.detail.value); run(loadLessons)"><view class="picker">{{ bookLabels[bookIndex] }} ▾</view></picker>
        <text v-else-if="!busy" class="muted">当前教材尚未收录可用素材，可修改学习信息查看其他教材。</text>
      </view>
      <view v-if="lesson" class="card"><button class="text-button" :disabled="busy" @tap="lesson = null; clearPreview()">返回素材目录</button><text class="title">{{ lesson.title }}</text><text class="muted">{{ lesson.note || (lesson.reviewStatus !== 'reviewed' ? '素材待校订，请结合教材核对。' : '') }}</text>
        <picker v-if="lesson.packs.length" :disabled="busy" :range="lesson.packs.map(p => kinds[p.kind] || p.kind)" :value="kindIndex" @change="kindIndex = Number($event.detail.value); choosePack()"><view class="picker">{{ kinds[pack?.kind || ''] || pack?.kind }} · {{ pack?.items.length }} 项 ▾</view></picker>
        <checkbox-group @change="selectVisible($event.detail.value)"><label v-for="item in visibleItems" :key="item.id" class="material"><checkbox :value="item.id" :checked="selectedIds.includes(item.id)" :disabled="busy" color="#216452" /><view><text>{{ item.text }}</text><text v-if="!pack?.kind.endsWith('Bilingual') && (item.translation || item.meaning)" class="muted">{{ item.translation || item.meaning }}</text></view></label></checkbox-group>
        <view class="actions"><button :disabled="busy" @tap="selectVisible(visibleItems.map(i => i.id))">本组全选</button><button :disabled="busy" @tap="selectedIds = []; clearPreview()">清空选择</button></view><text class="muted">已选 {{ selectedIds.length }} 项</text>
        <text v-if="!visibleItems.length" class="muted">本课内容待补充。</text>
        <view class="actions"><button :disabled="busy || page === 0" @tap="page--">上一组</button><text>第 {{ page + 1 }} 组</text><button :disabled="busy || (page + 1) * 20 >= (pack?.items.length || 0)" @tap="page++">下一组</button></view>
      </view>
      <view v-if="lesson" class="card"><text class="title">准备练习纸</text><text class="label">格子大小 / 行高：{{ printSize }} mm</text><slider :value="printSize" :min="6" :max="30" :step="0.5" :disabled="busy" activeColor="#216452" @change="printSize = Number($event.detail.value); clearPreview()" /><picker :disabled="busy" :range="['内置文楷','内置意大利体']" :value="printFont === 'wenkai' ? 0 : 1" @change="printFont = Number($event.detail.value) ? 'italic' : 'wenkai'; clearPreview()"><view class="picker">{{ printFont === 'wenkai' ? '内置文楷' : '内置意大利体' }} ▾</view></picker><label class="switch-row"><text>重复选中内容，铺满 A4</text><switch :checked="fillPage" :disabled="busy" color="#216452" @change="toggleOption('fillPage', $event)" /></label><label v-if="lesson.subject === 'cn' && ['characters','extraCharacters','words','extraWords'].includes(pack?.kind || '')" class="switch-row"><text>显示拼音（生字 / 词语）</text><switch :checked="showPinyin" :disabled="busy" color="#216452" @change="toggleOption('showPinyin', $event)" /></label><button class="primary" :disabled="busy || !selectedIds.length" @tap="generate()">生成 A4 字帖</button><button v-if="lesson.subject === 'cn'" :disabled="busy" @tap="openChallenge(lesson.id)">本课汉字闯关</button><button v-if="user && canPlan" :disabled="busy || !selectedIds.length || selectedIds.length > dailyLimit" @tap="makeDaily">加入今日练习（最多 {{ dailyLimit }} 项）</button><text class="muted">游客也可导出。计算练习按适用题型显示竖式过程。</text></view>
      <view v-if="!lesson" class="card"><button v-for="row in lessons" :key="row.id" class="list-button" :disabled="busy" @tap="openLesson(row)">{{ row.title }}</button><text v-if="!lessons.length && !busy" class="muted">暂无课次内容。</text></view>
    </view>

    <view v-if="tab === 'growth'" class="card"><WorksWall v-if="user" :key="user.id + ':' + user.activeChildId" :child-id="user.activeChildId" /><view v-else><text class="title">给孩子留一面作品墙</text><text class="muted">登录后，按孩子私密保存每天的作品，周末一起回顾。游客闯关星星仍保存在本机。</text><button class="primary" @tap="tab = 'account'">登录并查看作品墙</button></view></view>
    <view v-if="tab === 'account'">
      <view class="card" v-if="!user"><text class="title">{{ authMode === 'login' ? '登录小小笔尖' : authMode === 'register' ? '创建家庭账号' : '用恢复码找回密码' }}</text><text class="muted">{{ authMode === 'recover' ? '使用注册时保存的恢复码。更新密码后，原登录会话和旧恢复码都会失效。' : '网站与小程序使用同一个账号，孩子档案和收藏自动同步。' }}</text><label class="field"><text>账号</text><input v-model="username" :disabled="busy" maxlength="32" placeholder="3–32位字母、数字或中文" /></label><label v-if="authMode === 'recover'" class="field"><text>恢复码</text><input v-model="recoveryInput" :disabled="busy" maxlength="64" placeholder="请输入妥善保存的恢复码" /></label><label class="field"><text>{{ authMode === 'recover' ? '新密码' : '密码' }}</text><input v-model="password" :disabled="busy" password maxlength="128" placeholder="至少8位，可粘贴密码" /></label><label v-if="authMode !== 'login'" class="field"><text>再次输入{{ authMode === 'recover' ? '新密码' : '密码' }}</text><input v-model="confirmation" :disabled="busy" password maxlength="128" placeholder="请再次输入密码" /></label><button class="primary" :loading="busy" :disabled="busy || !username || !password || (authMode !== 'login' && !confirmation) || (authMode === 'recover' && !recoveryInput)" @tap="signIn">{{ authMode === 'login' ? '登录并同步' : authMode === 'register' ? '注册并保存恢复码' : '更新密码' }}</button><button disabled>微信快捷登录 · 未开通</button><view class="actions"><button :disabled="busy" class="text-button" @tap="changeAuth(authMode === 'register' ? 'login' : 'register')">{{ authMode === 'register' ? '已有账号，返回登录' : '注册新账号' }}</button><button :disabled="busy" class="text-button" @tap="changeAuth(authMode === 'recover' ? 'login' : 'recover')">{{ authMode === 'recover' ? '返回登录' : '忘记密码？' }}</button></view><text class="muted">游客浏览、闯关和导出字帖不需要登录。</text></view>
      <view v-else class="card"><text class="title">{{ user.username }}</text><text class="muted">当前孩子</text><picker :disabled="busy" :range="user.children" range-key="name" :value="user.children.findIndex(c => c.id === user?.activeChildId)" @change="switchChild(Number($event.detail.value))"><view class="picker">{{ child?.name }} ▾</view></picker><button :disabled="busy" @tap="run(async () => { await logout(); user = null; await boot() })">退出账号</button></view>
      <view v-if="user" class="card"><text class="title">账号安全</text><text class="muted">恢复码使用一次后失效，可以验证当前密码后生成新码。</text><button :disabled="busy" @tap="securityOpen = !securityOpen">{{ securityOpen ? '收起账号安全' : '管理恢复码' }}</button><view v-if="securityOpen"><label class="field"><text>当前密码</text><input v-model="securityPassword" :disabled="busy" password maxlength="128" placeholder="验证当前密码" /></label><button :disabled="busy || !securityPassword" @tap="renewRecovery">生成新的恢复码</button></view></view>
      <view v-if="recoveryCode" class="card"><text class="title">请妥善保存恢复码</text><text class="muted">忘记密码时可用此码找回账号。请保存在家长自己的安全位置，不要分享给他人。</text><text class="recovery-secret" selectable>{{ recoveryCode }}</text><button :disabled="busy" @tap="copyRecovery">复制恢复码</button><button class="primary" :disabled="busy" @tap="recoveryCode = ''; editing = true">我已保存，设置学习信息</button></view>
      <view class="card"><text class="title">学习信息</text><text class="muted">{{ summary }}</text><button :disabled="busy" class="text-button" @tap="editing ? run(async () => { restoreChild(); await loadBooks(); editing = false }) : editing = true">{{ editing ? '收起设置' : '修改学习信息' }}</button>
        <view v-if="editing"><text class="label">科目</text><picker :disabled="busy" :range="['语文','数学','英语']" :value="['cn','math','en'].indexOf(context.subject)" @change="setSubject((['cn','math','en'] as Subject[])[Number($event.detail.value)])"><view class="picker">{{ subjectNames[context.subject] }} ▾</view></picker>
          <text class="label">年级</text><picker :disabled="busy" :range="gradeNames" :value="grades.indexOf(context.grade)" @change="context.grade = grades[Number($event.detail.value)]"><view class="picker">{{ context.grade ? context.grade + '年级' : '幼儿园' }} ▾</view></picker>
          <view v-if="context.grade"><text class="label">册次</text><picker :disabled="busy" :range="['上册','下册']" :value="context.term === 'upper' ? 0 : 1" @change="context.term = Number($event.detail.value) ? 'lower' : 'upper'"><view class="picker">{{ context.term === 'upper' ? '上册' : '下册' }} ▾</view></picker><text class="label">{{ subjectNames[context.subject] }}教材</text><picker :disabled="busy" :range="editions[context.subject].map(e => e[1])" :value="Math.max(0, editions[context.subject].findIndex(e => e[0] === preferences[context.subject]))" @change="preferences[context.subject] = editions[context.subject][Number($event.detail.value)][0]"><view class="picker">{{ editions[context.subject].find(e => e[0] === preferences[context.subject])?.[1] || preferences[context.subject] }} ▾</view></picker></view>
          <button class="primary" :disabled="busy" @tap="saveSettings">{{ user ? '保存到当前孩子' : '使用这些素材' }}</button>
        </view>
      </view>
      <view v-if="user && !editing" class="card"><text class="title">常用排版 · 两端同步</text><text class="muted">{{ summary }} · {{ context.subject === 'cn' ? '词语字帖' : context.subject === 'en' ? '单词字帖' : '竖式计算' }}</text><text class="label">{{ context.subject === 'en' ? '行高' : '格子大小' }}：{{ size }} mm</text><slider :value="size" :min="6" :max="30" :step="0.5" :disabled="busy" activeColor="#216452" @change="size = Number($event.detail.value)" /><button :disabled="busy" @tap="saveLayout">保存常用排版</button><text class="muted">仅调整格子大小，保留已有字体、描红等设置。</text></view>
    </view>
    <view v-if="job" class="card"><text class="title">A4 字帖 · {{ job.pages }} 页</text><text v-if="job.unsupported" class="muted">{{ job.unsupported }} 道分数或混合运算保留原式，其余按竖式临摹。</text><image v-if="previewImage" class="paper" :src="previewImage" mode="widthFix" :show-menu-by-longpress="true" /><view class="actions"><button :disabled="busy || previewPage === 0" @tap="run(() => imagePage(previewPage - 1))">上一页</button><text>{{ previewPage + 1 }} / {{ job.pages }}</text><button :disabled="busy || previewPage + 1 >= (job.pages || 1)" @tap="run(() => imagePage(previewPage + 1))">下一页</button></view><button class="primary" :disabled="busy" @tap="exportFile(false)">导出全部 {{ job.pages }} 页 PDF</button><button :disabled="busy" @tap="exportFile(true)">保存第 {{ previewPage + 1 }} 页 PNG</button><button v-if="user" :disabled="busy" @tap="favoriteJob">保存并收藏到账号</button><text class="muted">PDF 为 A4；纸张打印请选择实际大小。服务器预览保留约30分钟，已保存文件可继续使用。</text></view>
    <text class="footnote">小小笔尖 · 每天一点，慢慢进步</text>
  </view>
</template>

<style scoped>
.page{--ink:#203b32;--muted:#5d7068;--accent:#216452;--line:#dce6df;max-width:680px;margin:auto;padding:12px 16px calc(16px + env(safe-area-inset-bottom));color:var(--ink);font-size:16px;line-height:1.6;background:#f5f7f2;min-height:100vh;box-sizing:border-box}
.brand{padding:12px 0 16px}.brand-mark{display:block;font-size:20px;font-weight:700;letter-spacing:1.5px}.muted{display:block;color:var(--muted);font-size:14px;line-height:1.65;margin:4px 0}.tabs{display:flex;gap:6px;margin-bottom:16px}.tabs button{display:flex;align-items:center;justify-content:center;flex:1;margin:0;padding:0 4px;background:#eaf0e9}.tabs .selected{color:#fff;background:var(--accent)}.card{padding:16px;margin-bottom:12px;background:#fff;border:1px solid var(--line);border-radius:12px}.hero{background:#e9f0dc}.heading{display:block;font-size:23px;font-weight:700;margin:6px 0}.eyebrow{font-size:14px;color:var(--accent)}.title{display:block;font-weight:650;font-size:17px;margin-bottom:6px}.label{display:block;margin-top:10px;font-size:14px}.field{display:block;margin:12px 0}.recovery-secret{display:block;font-family:monospace;font-size:18px;line-height:1.8;background:#fff5d9;padding:12px;border-radius:8px;overflow-wrap:anywhere;word-break:break-all}.field input{height:48px;min-height:48px;box-sizing:border-box;border:1px solid var(--line);border-radius:6px;padding:6px 10px;margin-top:4px;font-size:16px;background:#fafcf9}.picker{border:1px solid var(--line);border-radius:6px;padding:10px;min-height:48px;box-sizing:border-box;margin:6px 0;overflow-wrap:anywhere}button{font-size:15px;min-height:48px;line-height:1.5;padding:10px 8px;margin-top:10px;border-radius:7px;background:#eef3ed;color:var(--ink);white-space:normal}button::after{border:0}button.primary{background:var(--accent);color:white}button[disabled]{opacity:.55}button.text-button{background:transparent;color:var(--accent);text-align:left;padding-left:0}.list-button{text-align:left;background:#f5f7f2;overflow-wrap:anywhere}.feedback{padding:12px;margin-bottom:12px;border-radius:8px;background:#e9f0dc;font-size:14px}.error{background:#fff0e9;color:#873419}.material{display:flex;align-items:flex-start;gap:8px;padding:11px 0;border-bottom:1px solid var(--line);white-space:pre-wrap;overflow-wrap:anywhere}.paper{width:100%;height:auto;border:1px solid var(--line);margin-top:12px}.switch-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:52px;font-size:14px}.daily-row{border-top:1px solid var(--line);padding-top:12px;margin-top:12px}.content{display:block;white-space:pre-wrap;overflow-wrap:anywhere;max-height:320px;overflow:auto}.actions{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:13px}.actions button{flex:1;margin:0}.footnote{display:block;text-align:center;color:var(--muted);font-size:12px;margin:16px 0}
</style>
