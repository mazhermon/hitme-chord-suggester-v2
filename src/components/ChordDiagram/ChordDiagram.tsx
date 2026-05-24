import styles from './ChordDiagram.module.css'

interface ChordDiagramProps {
  /** Fret per string low→high; 0 = open, null = muted. */
  frets: (number | null)[]
  /** First fret shown (1 = open position / nut). */
  baseFret: number
  /** Chord name for the accessible label. */
  name?: string
}

const STRINGS = 6
const FRET_ROWS = 5
const COL = 12 // px between strings
const ROW = 14 // px between frets
const PAD_X = 10
const PAD_TOP = 16 // room for X/O markers
const NUT = 3

/** A compact six-string guitar chord diagram (dots = finger positions). */
export function ChordDiagram({ frets, baseFret, name }: ChordDiagramProps) {
  const width = PAD_X * 2 + (STRINGS - 1) * COL + 14
  const height = PAD_TOP + NUT + FRET_ROWS * ROW + 4
  const gridLeft = PAD_X
  const gridTop = PAD_TOP + NUT
  const openPosition = baseFret === 1

  const stringX = (s: number) => gridLeft + s * COL
  const fretY = (row: number) => gridTop + row * ROW

  return (
    <svg
      className={styles.diagram}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${name ?? ''} guitar chord diagram`}
    >
      {/* Nut (open position) */}
      {openPosition && (
        <rect
          x={gridLeft}
          y={gridTop - NUT}
          width={(STRINGS - 1) * COL}
          height={NUT}
          className={styles.nut}
        />
      )}

      {/* Fret lines */}
      {Array.from({ length: FRET_ROWS + 1 }, (_, r) => (
        <line
          key={`f${r}`}
          x1={gridLeft}
          y1={fretY(r)}
          x2={gridLeft + (STRINGS - 1) * COL}
          y2={fretY(r)}
          className={styles.line}
        />
      ))}

      {/* String lines */}
      {Array.from({ length: STRINGS }, (_, s) => (
        <line
          key={`s${s}`}
          x1={stringX(s)}
          y1={gridTop}
          x2={stringX(s)}
          y2={fretY(FRET_ROWS)}
          className={styles.line}
        />
      ))}

      {/* Position label when not open */}
      {!openPosition && (
        <text
          x={gridLeft + (STRINGS - 1) * COL + 5}
          y={gridTop + ROW - 3}
          className={styles.label}
        >
          {baseFret}fr
        </text>
      )}

      {/* Top markers (X muted / O open) + dots */}
      {frets.map((fret, s) => {
        const x = stringX(s)
        if (fret === null) {
          return (
            <text key={`m${s}`} x={x} y={PAD_TOP - 4} className={styles.marker}>
              ×
            </text>
          )
        }
        if (fret === 0) {
          return (
            <text key={`m${s}`} x={x} y={PAD_TOP - 4} className={styles.marker}>
              ○
            </text>
          )
        }
        const row = fret - baseFret + 1
        return (
          <circle
            key={`d${s}`}
            cx={x}
            cy={fretY(row) - ROW / 2}
            r={4}
            className={styles.dot}
          />
        )
      })}
    </svg>
  )
}
