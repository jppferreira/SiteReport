type CustomColorInputProps = {
  value: string;
  onChange: (hex: string) => void;
  onCommit: () => void;
};

/** Native builds pick a custom colour by typing a hex value. */
export function CustomColorInput(_props: CustomColorInputProps) {
  return null;
}
