import { HTML_BOOLEAN_ATTRIBUTES } from '../protocol/constants.js';

const booleanAttributes = new Set(HTML_BOOLEAN_ATTRIBUTES);

function normalizeStyle(value) {
  return value
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf(':');
      if (separator === -1) return entry;
      return `${entry.slice(0, separator).trim().toLowerCase()}:${entry.slice(separator + 1).trim()}`;
    })
    .sort()
    .join(';');
}

function escapeText(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', '&quot;');
}

export function canonicalizeNode(node, options = {}) {
  if (node.nodeType === Node.COMMENT_NODE) return '';
  if (node.nodeType === Node.TEXT_NODE) {
    const text = options.normalizeWhitespace ? node.textContent.replace(/\s+/g, ' ') : node.textContent;
    return escapeText(text);
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const tag = node.tagName.toLowerCase();
  const attributes = [...node.attributes]
    .map(({ name, value }) => {
      const normalizedName = name.toLowerCase();
      if (booleanAttributes.has(normalizedName)) return [normalizedName, ''];
      if (normalizedName === 'style') return [normalizedName, normalizeStyle(value)];
      return [normalizedName, value];
    })
    .sort(([left], [right]) => left.localeCompare(right));
  const serializedAttributes = attributes
    .map(([name, value]) => value === '' && booleanAttributes.has(name)
      ? ` ${name}`
      : ` ${name}="${escapeAttribute(value)}"`)
    .join('');
  const children = [...node.childNodes].map((child) => canonicalizeNode(child, options)).join('');
  return `<${tag}${serializedAttributes}>${children}</${tag}>`;
}

export function captureBehavior(root, api, frames = [], lifecycle = []) {
  const active = document.activeElement;
  const selectable = active && 'selectionStart' in active ? active : null;
  const liveProperties = {};
  root.querySelectorAll('input,textarea,select,option').forEach((element, index) => {
    liveProperties[`${element.tagName.toLowerCase()}:${index}`] = {
      value: 'value' in element ? element.value : null,
      checked: 'checked' in element ? element.checked : null,
      selected: 'selected' in element ? element.selected : null,
    };
  });
  return {
    canonicalMarkup: canonicalizeNode(root),
    state: api.state?.() ?? {},
    domIdentityPreserved: api.domIdentityPreserved ?? true,
    focus: active?.id || null,
    selection: selectable ? { start: selectable.selectionStart, end: selectable.selectionEnd } : null,
    liveProperties,
    frames,
    consistency: api.consistency?.() ?? {},
    lifecycle,
  };
}
