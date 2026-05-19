import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

const fg = '#d6d2c4'
const dim = '#6b675d'
const amber = '#f4c243'
const amber2 = '#d6a020'
const blue = '#6cb0e8'
const mag = '#d97aaa'
const red = '#b22222'

const retroTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#000',
      color: fg,
      height: '100%',
      fontSize: '18px',
    },
    '.cm-content': {
      fontFamily: 'var(--font-vt323), var(--font-plex-mono), monospace',
      caretColor: fg,
      padding: '4px 0',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-vt323), var(--font-plex-mono), monospace',
      lineHeight: '1',
    },
    '.cm-line': { padding: '0 8px' },
    '.cm-cursor': {
      borderLeftColor: fg,
      borderLeftWidth: '9px',
      opacity: 0.5,
    },
    '&.cm-focused .cm-cursor': { borderLeftColor: fg },
    '.cm-selectionBackground, ::selection': { backgroundColor: '#2e5a99' },
    '&.cm-focused .cm-selectionBackground, &.cm-focused ::selection': {
      backgroundColor: '#2e5a99',
    },
    '.cm-gutters': {
      backgroundColor: '#000',
      color: dim,
      borderRight: '1px solid #1a1814',
      fontFamily: 'var(--font-vt323), var(--font-plex-mono), monospace',
      paddingRight: '10px',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 8px',
      minWidth: '40px',
      fontSize: '16px',
    },
    '.cm-activeLineGutter': { backgroundColor: '#0a0808' },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '.cm-foldGutter': { display: 'none' },
    '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
      outline: `1px solid ${amber2}`,
    },
    '.cm-searchMatch': { backgroundColor: 'rgba(244, 194, 67, 0.25)' },
  },
  { dark: true },
)

const retroHighlight = HighlightStyle.define([
  { tag: t.heading1, color: amber, fontWeight: '700' },
  { tag: t.heading2, color: amber2, fontWeight: '700' },
  { tag: t.heading, color: amber },
  { tag: t.strong, color: fg, fontWeight: '700' },
  { tag: t.emphasis, color: amber, fontStyle: 'italic' },
  { tag: t.link, color: blue, textDecoration: 'underline' },
  { tag: t.url, color: blue },
  { tag: t.list, color: mag },
  { tag: t.monospace, color: amber },
  { tag: [t.literal, t.string], color: fg },
  { tag: t.number, color: blue },
  { tag: t.keyword, color: blue },
  { tag: t.atom, color: blue },
  { tag: [t.propertyName, t.attributeName], color: blue },
  { tag: t.variableName, color: fg },
  { tag: t.comment, color: dim, fontStyle: 'italic' },
  { tag: t.meta, color: mag },
  { tag: t.processingInstruction, color: mag },
  { tag: t.punctuation, color: mag },
  { tag: t.bracket, color: mag },
  { tag: t.angleBracket, color: mag },
  { tag: t.tagName, color: red },
  { tag: t.invalid, color: red },
])

export const retroExtension = [retroTheme, syntaxHighlighting(retroHighlight)]
