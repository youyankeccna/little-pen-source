export type Point = [number, number]
export interface StrokeResult { passed: boolean; message: string; deviation: number }
export const method: string
export function makeGuides(medians: Point[][]): Point[][]
export function length(points: Point[]): number
export function liveHint(points: Point[], guide: Point[]): string
export function analyzeStroke(points: Point[], guide: Point[]): StrokeResult
export function analyzeCharacter(strokes: Point[][], guides: Point[][]): StrokeResult & { method: string }
