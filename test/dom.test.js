import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { canonicalizeNode } from '../src/harness/dom.js';

const previousNode = globalThis.Node;

beforeAll(() => {
  globalThis.Node = { ELEMENT_NODE: 1, TEXT_NODE: 3, COMMENT_NODE: 8 };
});

afterAll(() => {
  globalThis.Node = previousNode;
});

const text = (textContent) => ({ nodeType: Node.TEXT_NODE, textContent });
const comment = (textContent) => ({ nodeType: Node.COMMENT_NODE, textContent });
const element = (tagName, attributes, childNodes = []) => ({
  nodeType: Node.ELEMENT_NODE,
  tagName,
  attributes: Object.entries(attributes).map(([name, value]) => ({ name, value })),
  childNodes,
});

describe('DOM canonicalization', () => {
  it('sorts attributes and styles while preserving text and data values', () => {
    const node = element('DIV', {
      style: 'color: red; background: white',
      'DATA-token': 'AbC',
      id: 'sample',
    }, [comment('ignored'), text(' A  B ')]);
    expect(canonicalizeNode(node)).toBe('<div data-token="AbC" id="sample" style="background:white;color:red"> A  B </div>');
  });

  it('normalizes only fixed true HTML boolean attributes by presence', () => {
    const node = element('INPUT', {
      checked: 'checked',
      disabled: 'false',
      'aria-hidden': 'false',
      'data-checked': 'false',
    });
    expect(canonicalizeNode(node)).toBe('<input aria-hidden="false" checked data-checked="false" disabled></input>');
  });

  it('normalizes whitespace only when explicitly requested', () => {
    const node = element('P', {}, [text('one   two')]);
    expect(canonicalizeNode(node)).toBe('<p>one   two</p>');
    expect(canonicalizeNode(node, { normalizeWhitespace: true })).toBe('<p>one two</p>');
  });
});
