function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseNmcliTerse(line) {
  const fields = [];
  let field = '';
  let escaped = false;

  for (const char of line) {
    if (escaped) {
      field += char;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === ':') {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  if (escaped) field += '\\';
  fields.push(field);
  return fields;
}

module.exports = { clamp, parseNmcliTerse };
