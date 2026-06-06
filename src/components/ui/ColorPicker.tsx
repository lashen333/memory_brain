// src\components\ui\ColorPicker.tsx
const COLORS = [
  '#7F77DD', '#1D9E75', '#EF9F27',
  '#378ADD', '#E24B4A', '#D4537E',
  '#6B9E3F', '#E07B39',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COLORS.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className="w-6 h-6 rounded-full transition-transform hover:scale-110"
          style={{
            backgroundColor: color,
            outline: value === color ? `2px solid ${color}` : 'none',
            outlineOffset: '2px',
          }}
        />
      ))}
    </div>
  )
}