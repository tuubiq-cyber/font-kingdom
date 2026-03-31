interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
}

const ColorPicker = ({ label, value, onChange }: ColorPickerProps) => {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-muted-foreground flex-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg border border-border cursor-pointer bg-transparent"
        />
        <span className="text-xs text-muted-foreground font-mono" dir="ltr">
          {value}
        </span>
      </div>
    </div>
  );
};

export default ColorPicker;
