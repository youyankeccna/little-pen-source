<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { request, privateImage, pickWorkImage, releaseFile } from '@/services/shared'
import type { FamilyWork } from '@/services/shared'
const props = defineProps<{ childId: string }>()
const works = ref<FamilyWork[]>([]), images = ref<Record<string, string>>({}), busy = ref(false), error = ref(''), notice = ref(''), trash = ref(false), filterDate = ref(''), visible = ref(12), selected = ref<string[]>([])
const today = ref(new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10)), workDate = ref(today.value), title = ref('今天的练字'), upload = ref<{ path: string; imageBase64: string } | null>(null)
const summary = ref({ thisWeek: 0, lastWeek: 0, thisWeekDays: 0, message: '' })
let alive = true, version = 0
const compared = computed(() => selected.value.map(id => works.value.find(w => w.id === id)).filter(Boolean) as FamilyWork[])
const comparison = computed(() => {
  if (compared.value.length !== 2) return '选择两件作品，一起看看同一个字的变化。'
  const [a, b] = [...compared.value].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  if (a.kind === 'trace' && b.kind === 'trace' && a.char === b.char && a.analysis?.method === b.analysis?.method && a.analysis?.guideHash === b.analysis?.guideHash && b.analysis && a.analysis && b.analysis.deviation < a.analysis.deviation - .008) return '这两次同字跟写中，后一次的笔迹更贴近参考线了。继续保持这份认真！'
  return '每一遍都值得留下。一起找找这两件作品里最喜欢的一笔吧。'
})
async function act(action: () => Promise<void>) {
  if (!alive || busy.value) return
  busy.value = true; error.value = ''; notice.value = ''
  try { await action() } catch (e) { if (alive) error.value = e instanceof Error ? e.message : '暂时无法完成，请重试。' } finally { busy.value = false }
}
async function loadImage(work: FamilyWork, expected = version) {
  if (work.deleted || images.value[work.id]) return
  try {
    const path = await privateImage('/works/' + work.id + '/image', props.childId)
    if (!alive || expected !== version) { releaseFile(path); return }
    if (images.value[work.id]) releaseFile(images.value[work.id])
    images.value[work.id] = path
  } catch { if (alive) error.value = '有作品图片暂未载入，可以点击重试。' }
}
async function warmImages() {
  const rows = works.value.slice(0, visible.value), expected = version
  for (let i = 0; i < rows.length; i += 4) { if (!alive || expected !== version) return; await Promise.all(rows.slice(i, i + 4).map(w => loadImage(w, expected))) }
}
async function refresh() {
  const expected = ++version
  const [list, stats] = await Promise.all([
    request<{ works: FamilyWork[]; today: string }>('/works?trash=' + (trash.value ? '1' : '0') + (filterDate.value ? '&date=' + filterDate.value : ''), 'GET', undefined, props.childId),
    request<typeof summary.value>('/works/summary', 'GET', undefined, props.childId)
  ])
  if (!alive || expected !== version) return
  Object.values(images.value).forEach(releaseFile); images.value = {}; works.value = list.works; today.value = list.today; summary.value = stats; visible.value = 12; selected.value = []
  await warmImages()
}
async function choose() { await act(async () => { try { upload.value = await pickWorkImage() } catch (e) { if (e instanceof Error && e.message.includes('未选择')) return; throw e } }) }
async function save() { await act(async () => {
  if (!upload.value) return
  await request('/works', 'POST', { imageBase64: upload.value.imageBase64, date: workDate.value, title: title.value }, props.childId)
  upload.value = null; trash.value = false; filterDate.value = ''; await refresh(); notice.value = '作品已私密保存，网站和小程序都能查看。'
}) }
async function remove(work: FamilyWork) { await act(async () => { await request('/works/' + work.id, 'DELETE', {}, props.childId); await refresh(); notice.value = '已移入回收站，可以恢复。' }) }
async function restore(work: FamilyWork) { await act(async () => { await request('/works/' + work.id + '/restore', 'POST', {}, props.childId); await refresh(); notice.value = '作品已恢复。' }) }
function selectWorks(values: string[]) { selected.value = values.slice(-2) }
onMounted(() => act(refresh))
onBeforeUnmount(() => { alive = false; version++; Object.values(images.value).forEach(releaseFile) })
</script>

<template>
  <view class="wall">
    <text class="title">作品墙 · 把认真留下来</text><text class="muted">仅当前账号和孩子可见，作品不会自动公开。</text>
    <view class="week"><text>本周 {{ summary.thisWeek }} 件 · {{ summary.thisWeekDays }} 天</text><text>上周 {{ summary.lastWeek }} 件</text></view>
    <text v-if="busy" class="status">正在保存或读取作品…</text><text v-if="error" class="error">{{ error }}</text><text v-if="notice" class="status">{{ notice }}</text>
    <button class="primary" :disabled="busy" @tap="choose">拍照 / 选择练字作品</button>
    <view v-if="upload" class="upload"><image class="photo" :src="upload.path" mode="aspectFit" /><label class="field"><text>作品名称</text><input v-model="title" :disabled="busy" maxlength="60" /></label><text class="label">作品日期</text><picker mode="date" :value="workDate" :end="today" :disabled="busy" @change="workDate = $event.detail.value"><view class="picker">{{ workDate }} ▾</view></picker><button class="primary" :disabled="busy || !title.trim()" @tap="save">保存到当前孩子</button><button :disabled="busy" @tap="upload = null">暂不保存</button></view>
    <view class="filters"><button :disabled="busy" @tap="trash = !trash; act(refresh)">{{ trash ? '返回作品墙' : '查看回收站' }}</button><picker mode="date" :value="filterDate || today" :end="today" :disabled="busy" @change="filterDate = $event.detail.value; act(refresh)"><view class="picker">{{ filterDate || '按日期查找' }} ▾</view></picker><button v-if="filterDate" :disabled="busy" @tap="filterDate = ''; act(refresh)">全部日期</button><button :disabled="busy" @tap="act(refresh)">刷新</button></view>
    <text v-if="!works.length && !busy" class="muted">{{ trash ? '回收站里还没有作品。' : '先留下一件作品，下次就能看到自己的积累。' }}</text>
    <text v-if="!trash && works.length > 1 && !selected.length" class="muted">勾选两件作品，一起对比同一个字的变化。</text><view v-if="!trash && selected.length" class="comparison"><text class="subtitle">选两件，一起回顾</text><text class="muted">{{ comparison }}</text><view v-if="compared.length === 2" class="compare-grid"><view v-for="work in compared" :key="work.id"><image v-if="images[work.id]" class="photo" :src="images[work.id]" mode="aspectFit" /><text>{{ work.date }} · {{ work.title }}</text></view></view></view>
    <checkbox-group @change="selectWorks($event.detail.value)"><view class="grid"><view v-for="work in works.slice(0, visible)" :key="work.id" class="work"><image v-if="images[work.id]" class="photo" :src="images[work.id]" mode="aspectFit" /><button v-else-if="!trash" :disabled="busy" @tap="loadImage(work)">读取作品图片</button><text class="subtitle">{{ work.title }}</text><text class="muted">{{ work.date }} · {{ work.kind === 'trace' ? '屏幕跟写' : '纸上作品' }}</text><label v-if="!trash" class="compare-choice"><checkbox :value="work.id" :checked="selected.includes(work.id)" :disabled="busy" color="#216452" /><text>加入对比</text></label><button v-if="!trash" :disabled="busy" @tap="remove(work)">移入回收站</button><button v-else :disabled="busy" @tap="restore(work)">恢复作品</button></view></view></checkbox-group>
    <button v-if="visible < works.length" :disabled="busy" @tap="act(async () => { visible += 12; await warmImages() })">再看 12 件</button><text v-if="works.length === 100" class="muted">当前显示最近100件，可按日期查找更早作品。</text>
    <text class="muted footnote">拍照作品先留存和对比；AI 拍照点评尚未开通。</text>
  </view>
</template>

<style scoped>
.wall{color:#203b32}.title{display:block;font-size:18px;font-weight:650}.subtitle{display:block;font-size:15px;font-weight:600;overflow-wrap:anywhere}.muted{display:block;color:#5d7068;font-size:14px;line-height:1.7;margin:8px 0}.week{display:flex;justify-content:space-between;gap:12px;background:#e9f0dc;border-radius:10px;padding:16px;margin:12px 0;font-size:15px;flex-wrap:wrap}button{min-height:48px;background:#eef3ed;color:#203b32;font-size:14px;border-radius:8px;padding:10px 8px;line-height:1.5;margin-top:10px}button::after{border:0}button.primary{background:#216452;color:#fff}button[disabled]{opacity:.55}.status,.error{display:block;padding:12px;border-radius:8px;font-size:14px;line-height:1.7;background:#e9f0dc;margin:10px 0}.error{background:#fff0e9;color:#873419}.filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:16px 0}.filters button{margin:0}.picker{border:1px solid #dce6df;padding:10px;min-height:48px;box-sizing:border-box;border-radius:8px;font-size:14px}.grid,.compare-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.work,.comparison,.upload{border:1px solid #dce6df;border-radius:10px;padding:12px;margin:12px 0;min-width:0}.photo{width:100%;height:160px;background:#f5f7f2;border-radius:6px;display:block}.upload>.photo{height:240px}.field{display:block;font-size:14px;margin-top:12px}.field input{border:1px solid #dce6df;border-radius:6px;box-sizing:border-box;min-height:48px;padding:10px;margin:8px 0;font-size:16px}.label{font-size:14px}.compare-choice{display:flex;align-items:center;gap:4px;font-size:13px;min-height:44px}.compare-grid text{display:block;font-size:13px;line-height:1.7;overflow-wrap:anywhere}.footnote{font-size:12px;margin-top:18px}@media(max-width:350px){.grid{grid-template-columns:1fr}}
</style>
