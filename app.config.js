/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

/**
 * Android DatePickerDialog has no runtime accent prop. The config plugin needs
 * raw strings, read from theme/colors.ts so they stay the light brand tokens.
 * Dark matches light because the product theme is light-only.
 */
function loadBrandColors() {
  const filename = path.join(__dirname, 'theme', 'colors.ts');
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled._compile(outputText, filename);
  return compiled.exports.colors.light;
}

function pickerColor(value) {
  return { light: value, dark: value };
}

const brand = loadBrandColors();

/** @param {{ config: import('expo/config').ExpoConfig }} ctx */
module.exports = ({ config }) => ({
  ...config,
  name: config.name ?? 'Trade Report',
  slug: config.slug ?? 'tradesreport',
  plugins: (config.plugins ?? []).map((plugin) => {
    const name = typeof plugin === 'string' ? plugin : plugin[0];
    if (name !== '@react-native-community/datetimepicker') return plugin;
    return [
      '@react-native-community/datetimepicker',
      {
        android: {
          datePicker: {
            colorAccent: pickerColor(brand.accent),
            colorControlActivated: pickerColor(brand.accent),
            colorControlHighlight: pickerColor(brand.accentSoft),
            textColorPrimary: pickerColor(brand.textPrimary),
            textColorSecondary: pickerColor(brand.textSecondary),
            textColorPrimaryInverse: pickerColor(brand.accentOnAccent),
            textColorSecondaryInverse: pickerColor(brand.accentOnAccent),
            windowBackground: pickerColor(brand.surface),
          },
        },
      },
    ];
  }),
});
