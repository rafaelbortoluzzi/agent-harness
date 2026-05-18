import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

const fg0 = '#d6f5d6'
const fg1 = 'oklch(0.88 0.13 145)'
const fg2 = 'oklch(0.72 0.11 145)'
const fg3 = 'oklch(0.56 0.08 145)'
const fg4 = 'oklch(0.42 0.05 145)'
const fg5 = 'oklch(0.30 0.03 145)'
const bg1 = '#0a0e0a'
const bg4 = '#161d16'
const bg5 = '#1c2a1c'
const yellow = 'oklch(0.84 0.16 95)'
const red = 'oklch(0.68 0.18 25)'
const blue = 'oklch(0.70 0.11 220)'
const mag = 'oklch(0.70 0.13 320)'

const phosphorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: fg0,
      height: '100%',
      fontSize: '13px',
    },
    '.cm-content': {
      fontFamily: 'var(--ah-font)',
      padding: '14px 0 30px',
      caretColor: fg1,
    },
    '.cm-scroller': {
      fontFamily: 'var(--ah-font)',
      lineHeight: '1.7',
    },
    '.cm-line': { padding: '0 14px' },
    '.cm-cursor': {
      borderLeftColor: fg1,
      borderLeftWidth: '2px',
      filter: `drop-shadow(0 0 4px ${fg1})`,
    },
    '&.cm-focused .cm-cursor': { borderLeftColor: fg0 },
    '.cm-selectionBackground, ::selection': { backgroundColor: bg5 },
    '&.cm-focused .cm-selectionBackground, &.cm-focused ::selection': {
      backgroundColor: '#233a25',
    },
    '.cm-gutters': {
      backgroundColor: bg1,
      color: fg5,
      borderRight: '1px solid rgba(120, 200, 120, 0.10)',
      fontFamily: 'var(--ah-font)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px',
      minWidth: '40px',
      fontSize: '11px',
    },
    '.cm-activeLineGutter': { backgroundColor: bg4 },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '.cm-foldGutter span': { color: fg5 },
    '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
      backgroundColor: bg4,
      outline: `1px solid ${fg3}`,
    },
    '.cm-searchMatch': { backgroundColor: 'rgba(220, 200, 80, 0.25)' },
    '.cm-tooltip': {
      backgroundColor: '#0d120d',
      border: '1px solid rgba(120, 200, 120, 0.18)',
      color: fg1,
    },
  },
  { dark: true },
)

const phosphorHighlight = HighlightStyle.define([
  { tag: t.heading, color: fg0, fontWeight: '600' },
  { tag: t.strong, color: fg0, fontWeight: '600' },
  { tag: t.emphasis, color: fg1, fontStyle: 'italic' },
  { tag: t.link, color: blue, textDecoration: 'underline' },
  { tag: t.url, color: blue },
  { tag: t.list, color: fg1 },
  { tag: t.quote, color: fg2, fontStyle: 'italic' },
  { tag: t.monospace, color: fg1 },
  { tag: [t.literal, t.string], color: yellow },
  { tag: t.number, color: mag },
  { tag: t.bool, color: mag },
  { tag: t.null, color: fg4 },
  { tag: t.keyword, color: fg0 },
  { tag: t.atom, color: blue },
  { tag: [t.propertyName, t.attributeName], color: fg1 },
  { tag: t.variableName, color: fg0 },
  { tag: [t.typeName, t.className], color: blue },
  { tag: t.comment, color: fg4, fontStyle: 'italic' },
  { tag: t.meta, color: fg3 },
  { tag: t.processingInstruction, color: fg4 },
  { tag: t.punctuation, color: fg3 },
  { tag: t.bracket, color: fg3 },
  { tag: t.angleBracket, color: fg3 },
  { tag: t.tagName, color: red },
  { tag: t.invalid, color: red },
])

export const phosphorExtension = [phosphorTheme, syntaxHighlighting(phosphorHighlight)]
