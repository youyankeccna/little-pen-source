<script setup lang="ts">
import { ref, computed, getCurrentInstance, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { request } from '@/services/shared'
import { makeGuides, analyzeStroke, liveHint } from '../../shared/writing-coach.mjs'
import type { Point } from '../../shared/writing-coach.mjs'
const props = defineProps<{ childId?: string; owner: string; grade: number; term: string; series: string; lessonId?: string }>()
const emit = defineEmits<{ (event: 'saved'): void }>()
const vm = getCurrentInstance(), characters = ref<string[]>([]), index = ref(0), lesson = ref(''), title = ref(''), hasMore = ref(false), offset = ref(0)
const guides = ref<Point[][]>([]), strokes = ref<Point[][]>([]), current = ref<Point[]>([]), drawing = ref(false), complete = ref(false), busy = ref(false), error = ref(''), message = ref(''), stars = ref<string[]>([]), cloudStars = ref(0), saveWork = ref(true), synced = ref(false)
const char = computed(() => characters.value[index.value] || ''), step = computed(() => strokes.value.length)
const finishedLine = computed(() => characters.value.length > 0 && characters.value.every(c => stars.value.includes(c)))
let pendingStart = false, pressVersion = 0
let canvas: UniApp.CanvasContext | null = null, timer: ReturnType<typeof setTimeout> | undefined, alive = true, bounds = { left: 0, top: 0 }
const side = Math.min(280, uni.getSystemInfoSync().windowWidth - 64), day = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)
const storageKey = computed(() => 'little-pen-challenge:' + props.owner + ':' + day + ':' + lesson.value)
function line(points: Point[], color: string, width: number) {
  if (!canvas || !points.length) return
  canvas.beginPath(); canvas.setStrokeStyle(color); canvas.setLineWidth(width); canvas.setLineCap('round'); canvas.setLineJoin('round')
  canvas.moveTo(points[0][0] * side, points[0][1] * side)
  for (let i = 1; i < points.length; i++) canvas.lineTo(points[i][0] * side, points[i][1] * side)
  canvas.stroke()
}
function draw() {
  if (!canvas || !alive) return
  canvas.setFillStyle('#ffffff'); canvas.fillRect(0, 0, side, side)
  canvas.setStrokeStyle('#dce6df'); canvas.setLineWidth(1); canvas.strokeRect(1, 1, side - 2, side - 2)
  canvas.setLineDash([4, 5], 0); line([[.5, 0], [.5, 1]], '#dce6df', 1); line([[0, .5], [1, .5]], '#dce6df', 1); canvas.setLineDash([], 0)
  for (const guide of guides.value) line(guide, '#e1e9e3', 16)
  for (const stroke of strokes.value) line(stroke, '#216452', 10)
  line(current.value, '#203b32', 10)
  if (!complete.value && guides.value[step.value]) { const p = guides.value[step.value][0]; canvas.beginPath(); canvas.setFillStyle('#c47d20'); canvas.arc(p[0] * side, p[1] * side, 5, 0, Math.PI * 2); canvas.fill() }
  canvas.draw()
}
function schedule() { if (!timer) timer = setTimeout(() => { timer = undefined; draw() }, 16) }
function point(event: unknown): Point | null {
  const e = event as { touches?: { x?: number; y?: number; clientX: number; clientY: number }[]; clientX?: number; clientY?: number }
  const t = e.touches?.[0]
  const x = t?.x ?? ((t?.clientX ?? e.clientX ?? NaN) - bounds.left), y = t?.y ?? ((t?.clientY ?? e.clientY ?? NaN) - bounds.top)
  return Number.isFinite(x) && Number.isFinite(y) ? [Math.max(0, Math.min(1, x / side)), Math.max(0, Math.min(1, y / side))] : null
}
function start(event: unknown) {
  if (!alive || busy.value || complete.value || !guides.value[step.value] || drawing.value || pendingStart) return
  const own = ++pressVersion; pendingStart = true
  uni.createSelectorQuery().in(vm?.proxy).select('.coach-canvas').boundingClientRect(rect => {
    if (!alive || own !== pressVersion) return
    pendingStart = false; const r = rect as { left: number; top: number }; if (r) bounds = { left: r.left, top: r.top }
    const p = point(event); if (!p) return
    drawing.value = true; current.value = [p]; schedule()
  }).exec()
}
function move(event: unknown) {
  if (!alive || !drawing.value) return
  const p = point(event); if (!p) return
  const last = current.value[current.value.length - 1]
  if (Math.hypot(p[0] - last[0], p[1] - last[1]) < .004) return
  current.value.push(p)
  if (current.value.length > 200) current.value = current.value.filter((_, i) => i % 2 === 0)
  message.value = liveHint(current.value, guides.value[step.value]); schedule()
}
async function end() {
  if (pendingStart) { pendingStart = false; pressVersion++; return }
  if (!alive || !drawing.value) return
  drawing.value = false
  const result = analyzeStroke(current.value, guides.value[step.value]); message.value = result.message
  if (result.passed) strokes.value.push(current.value.map(p => [...p] as Point))
  current.value = []; draw()
  if (strokes.value.length === guides.value.length) {
    complete.value = true; synced.value = false
    if (!stars.value.includes(char.value)) stars.value.push(char.value)
    uni.setStorageSync(storageKey.value, stars.value)
    message.value = '这一遍认真写完啦，为你点亮一颗星！'; draw()
    if (props.childId) await syncAttempt()
  }
}
function cancel() { pendingStart = false; pressVersion++; drawing.value = false; current.value = []; draw() }
async function syncAttempt() {
  if (!alive || !props.childId || !complete.value || busy.value) return
  busy.value = true; error.value = ''
  try {
    const result = await request<{ passed: boolean; message: string; stars: number; work?: unknown }>('/writing/attempts', 'POST', { char: char.value, lessonId: lesson.value, strokes: strokes.value, saveWork: saveWork.value }, props.childId)
    if (!alive) return
    if (!result.passed) { complete.value = false; stars.value = stars.value.filter(c => c !== char.value); uni.setStorageSync(storageKey.value, stars.value); strokes.value = []; message.value = result.message; draw(); return }
    synced.value = true; cloudStars.value = result.stars; message.value = saveWork.value ? '星星已点亮，这一遍也存进作品墙啦。' : '星星已同步，继续保持这份认真。'; emit('saved')
  } catch (e) { if (alive) error.value = '这一遍已在本机完成，云端暂未同步，可稍后重试。' } finally { busy.value = false }
}
async function loadCharacter() {
  busy.value = true; error.value = ''; guides.value = []; strokes.value = []; current.value = []; complete.value = false; synced.value = false; drawing.value = false; pendingStart = false; pressVersion++
  try {
    const result = await request<{ guide: { medians: Point[][] } }>('/writing/guide/' + encodeURIComponent(char.value))
    if (!alive) return
    guides.value = makeGuides(result.guide.medians); message.value = '从亮起来的起点出发，按顺序慢慢写。'; await nextTick(); canvas = uni.createCanvasContext('trace-board', vm?.proxy); updateBounds(); draw(); focusBoard()
  } catch (e) { error.value = e instanceof Error ? e.message : '参考字形暂时无法读取。' } finally { busy.value = false }
}
async function loadGroup(next = false) {
  busy.value = true; error.value = ''; const requestedOffset = offset.value + (next ? 5 : 0)
  try {
    const query = `?grade=${props.grade}&term=${props.term}&series=${encodeURIComponent(props.series)}&offset=${requestedOffset}` + (props.lessonId ? '&lessonId=' + encodeURIComponent(props.lessonId) : '')
    const result = await request<{ characters: string[]; title: string; lessonId: string; hasMore: boolean }>('/writing/challenge' + query)
    if (!alive) return
    offset.value = requestedOffset; characters.value = result.characters; lesson.value = result.lessonId; title.value = result.title; hasMore.value = result.hasMore; index.value = 0
    const saved = uni.getStorageSync(storageKey.value); stars.value = Array.isArray(saved) ? saved.filter(c => typeof c === 'string') : []
    if (props.childId) {
      const progress = await request<{ stars: number; completed: { char: string; lessonId: string }[] }>('/writing/progress', 'GET', undefined, props.childId)
      if (!alive) return
      cloudStars.value = progress.stars; stars.value = [...new Set([...stars.value, ...progress.completed.filter(c => c.lessonId === lesson.value).map(c => c.char)])]
    }
    if (characters.value.length) { index.value = Math.max(0, characters.value.findIndex(c => !stars.value.includes(c))); await loadCharacter() }
    else message.value = '这个范围暂未收录可跟写的字，可先到素材库准备纸上练习。'
  } catch (e) { if (alive) error.value = e instanceof Error ? e.message : '练习暂时无法读取。' } finally { busy.value = false }
}
async function nextCharacter() { if (index.value + 1 < characters.value.length) { index.value++; await loadCharacter() } }
function focusBoard() {
  const query = uni.createSelectorQuery().in(vm?.proxy)
  query.select('.guide-title').boundingClientRect(() => {}); query.selectViewport().scrollOffset(() => {})
  query.exec(result => { if (!alive) return; const rect = result[0] as { top: number }, viewport = result[1] as { scrollTop: number }; if (rect && viewport) uni.pageScrollTo({ scrollTop: Math.max(0, rect.top + viewport.scrollTop - 90), duration: 0 }) })
}
function updateBounds() { uni.createSelectorQuery().in(vm?.proxy).select('.coach-canvas').boundingClientRect(rect => { const r = rect as { left: number; top: number }; if (r) bounds = { left: r.left, top: r.top } }).exec() }
onMounted(() => loadGroup())
onBeforeUnmount(() => { alive = false; if (timer) clearTimeout(timer) })
</script>

<template>
  <view class="challenge">
    <text class="title">汉字闯关 · 写一字，亮一星</text><text class="muted">{{ title }}</text>
    <view class="stars"><text v-for="(c, i) in characters" :key="c" class="star" :class="{ lit: stars.includes(c), current: i === index }">{{ stars.includes(c) ? '★' : '☆' }}<text class="star-char">{{ c }}</text></text></view>
    <text v-if="childId" class="muted">今天已点亮 {{ cloudStars }} 颗星星；同一个字在同一课每天只计一次。</text><text v-else class="muted">游客也能闯关，星星保存在本机。</text>
    <text v-if="characters.length" class="guide-title">写「{{ char }}」 · 第 {{ Math.min(step + 1, guides.length) }} / {{ guides.length }} 笔</text>
    <view v-if="characters.length" :style="{ width: side + 'px', height: side + 'px' }" class="canvas-wrap">
      <canvas canvas-id="trace-board" id="trace-board" class="coach-canvas" :style="{ width: side + 'px', height: side + 'px' }" :disable-scroll="true" @touchstart.stop.prevent="start" @touchmove.stop.prevent="move" @touchend.stop.prevent="end" @touchcancel="cancel" @mousedown="start" @mousemove="move" @mouseup="end" @mouseleave="cancel" />
    </view>
    <text class="encouragement" :class="{ completed: complete }" aria-live="polite">{{ complete ? '★ ' : '' }}{{ busy ? '正在准备或同步，请稍候…' : message }}</text><text v-if="error" class="error">{{ error }}</text>
    <view v-if="finishedLine" class="celebration"><view class="flower"><view v-for="n in 5" :key="n" class="petal" :style="{ transform: 'rotate(' + (n - 1) * 72 + 'deg) translateY(-14px)' }" /><view class="flower-center" /></view><text>一行小星星，让小花开啦！</text></view>
    <label v-if="childId" class="save-option"><text>完成后私密保存这一遍作品</text><switch :checked="saveWork" :disabled="busy" color="#216452" @change="saveWork = Boolean(($event as any).detail.value)" /></label>
    <view class="actions"><button :disabled="busy || !characters.length" @tap="loadCharacter">再写这一遍</button><button v-if="complete && index + 1 < characters.length" class="primary" :disabled="busy" @tap="nextCharacter">继续写「{{ characters[index + 1] }}」</button><button v-if="complete && childId && !synced" :disabled="busy" @tap="syncAttempt">同步这一遍练习</button><button v-if="finishedLine && hasMore" class="primary" :disabled="busy" @tap="loadGroup(true)">打开下一组</button><button v-if="error && !characters.length" :disabled="busy" @tap="loadGroup(false)">重新读取</button></view>
    <text class="muted footnote">参考线帮助观察起点、方向和形状；屏幕跟写不能替代纸笔练习。拍照 AI 点评尚未开通。</text>
  </view>
</template>

<style scoped>
.challenge{color:#203b32}.title{display:block;font-size:18px;font-weight:650}.muted{display:block;color:#5d7068;font-size:14px;line-height:1.7;margin:6px 0}.stars{display:flex;justify-content:space-around;padding:12px 0}.star{font-size:34px;color:#9baaa2;text-align:center}.star-char{display:block;font-size:16px;color:#203b32}.star.lit{color:#ad6c0e;animation:star-pop .3s ease-out}.star.current .star-char{text-decoration:underline;text-underline-offset:5px}.guide-title{display:block;font-size:17px;font-weight:600;margin:10px 0}.canvas-wrap{width:280px;height:280px;max-width:100%;margin:12px auto;touch-action:none}.coach-canvas{width:280px;height:280px;touch-action:none}.encouragement{display:block;min-height:54px;line-height:1.7;padding:12px;background:#e9f0dc;border-radius:10px;font-size:16px}.encouragement.completed{background:#fff5d9;color:#6c460b}.error{display:block;color:#873419;line-height:1.7;font-size:14px;margin-top:8px}.actions{display:flex;flex-wrap:wrap;gap:8px}.actions button{flex:1;min-width:120px;min-height:48px;background:#eef3ed;color:#203b32;font-size:15px;border-radius:8px;padding:10px 8px;line-height:1.5;margin-top:12px}.actions button::after{border:0}.actions button.primary{background:#216452;color:#fff}.actions button[disabled]{opacity:.55}.save-option{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:56px;font-size:14px}.celebration{display:flex;align-items:center;gap:28px;padding:24px;background:#fff5d9;border-radius:10px;margin-top:12px;animation:flower-in .45s ease-out}.flower{position:relative;flex:0 0 36px;height:36px}.petal{position:absolute;left:8px;top:9px;width:20px;height:20px;border-radius:50%;background:#d28d40;transform-origin:10px 10px}.flower-center{position:absolute;left:8px;top:9px;width:20px;height:20px;border-radius:50%;background:#f6d864}.footnote{font-size:12px;margin-top:16px}@keyframes star-pop{0%{transform:scale(.7);opacity:.4}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}@keyframes flower-in{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}@media(prefers-reduced-motion:reduce){.star.lit,.celebration{animation:none}}
</style>
