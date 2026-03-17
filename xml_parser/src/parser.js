// sample parser utility for unit tests

export function isXmlString(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return false;
  }

  const trimmed = text.trim();
  if (!trimmed.startsWith('<')) {
    return false;
  }

  const parseTagName = (str) => {
    let i = 1;
    let inQuote = null;

    while (i < str.length) {
      const ch = str[i];
      if (inQuote) {
        if (ch === inQuote) {
          inQuote = null;
        }
      } else {
        if (ch === '"' || ch === "'") {
          inQuote = ch;
        } else if (ch === '>') {
          break;
        }
      }
      i++;
    }

    if (i >= str.length || str[i] !== '>') {
      return null;
    }

    const openTag = str.slice(0, i + 1);
    const m = openTag.match(/^<\s*([\w:-]+)/);
    return m ? m[1] : null;
  };

  const rootName = parseTagName(trimmed);
  if (!rootName) {
    return false;
  }

  if (trimmed.endsWith('/>')) {
    return true;
  }

  return trimmed.endsWith(`</${rootName}>`);
}

export function parseTagName(xml) {
  if (!isXmlString(xml)) {
    throw new Error('Invalid XML string');
  }
  const match = xml.trim().match(/^<\s*([a-zA-Z0-9_:-]+)/);
  return match ? match[1] : null;
}

function parseAttributes(attrString) {
  const attributes = {};
  const re = /([^\s=]+)\s*=\s*(['"])([\s\S]*?)\2/g;
  let m;
  while ((m = re.exec(attrString)) !== null) {
    attributes[m[1]] = m[3];
  }
  return attributes;
}

export function parseXML(xml) {
  if (!isXmlString(xml)) {
    throw new Error('Invalid XML string');
  }

  const cleaned = xml
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<\?([\s\S]*?)\?>/g, '')
    .trim();

  function tokenizeXml(str) {
    const result = [];
    let i = 0;

    while (i < str.length) {
      if (str[i] === '<') {
        let j = i + 1;
        let inQuote = null;

        while (j < str.length) {
          const ch = str[j];
          if (inQuote) {
            if (ch === inQuote) {
              inQuote = null;
            }
          } else {
            if (ch === '"' || ch === "'") {
              inQuote = ch;
            } else if (ch === '>') {
              break;
            }
          }
          j += 1;
        }

        if (j >= str.length) {
          throw new Error('Malformed XML: missing closing >');
        }

        result.push(str.slice(i, j + 1));
        i = j + 1;
      } else {
        let j = i;
        while (j < str.length && str[j] !== '<') {
          j += 1;
        }
        const chunk = str.slice(i, j);
        if (chunk.trim()) {
          result.push(chunk);
        }
        i = j;
      }
    }

    return result;
  }

  const tokens = tokenizeXml(cleaned);

  const stack = [];
  let root = null;

  for (const token of tokens) {
    if (!token.trim()) continue;

    if (token.startsWith('</')) {
      stack.pop();
      continue;
    }

    if (token.startsWith('<')) {
      const selfClosing = token.endsWith('/>');
      const inner = token.slice(1, selfClosing ? -2 : -1).trim();
      const spaceIdx = inner.search(/\s/);
      const tagName = spaceIdx === -1 ? inner : inner.slice(0, spaceIdx);
      const attrString = spaceIdx === -1 ? '' : inner.slice(spaceIdx).trim();

      const node = {
        tagName,
        attributes: parseAttributes(attrString),
        children: [],
      };

      if (!root) {
        root = node;
      }

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(node);
      }

      if (!selfClosing) {
        stack.push(node);
      }

      continue;
    }

    // text node: ignore whitespace-only
    if (token.trim()) {
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.children.push({ text: token.trim() });
      }
    }
  }

  return root;
}

function deepUpdate(target, source) {
  if (!source || typeof source !== 'object') return;

  if (source.attributes && typeof source.attributes === 'object') {
    target.attributes = target.attributes || {};
    for (const key of Object.keys(source.attributes)) {
      if (!(key in target.attributes)) {
        target.attributes[key] = source.attributes[key];
      }
    }
  }

  target.children = target.children || [];
  if (Array.isArray(source.children)) {
    source.children.forEach((sourceChild, index) => {
      if (!target.children[index]) {
        target.children[index] = sourceChild;
        return;
      }

      if (sourceChild.tagName && target.children[index].tagName === sourceChild.tagName) {
        deepUpdate(target.children[index], sourceChild);
      }
    });
  }
}

export function syncXmlObject(xml, object) {
  const parsed = parseXML(xml);
  if (!parsed) {
    throw new Error('Cannot parse XML');
  }

  if (!object || typeof object !== 'object') {
    throw new Error('Target object must be an object');
  }

  if (!object.tagName) {
    object.tagName = parsed.tagName;
  }

  if (object.tagName !== parsed.tagName) {
    throw new Error(`Tag mismatch: expected ${object.tagName} but XML root is ${parsed.tagName}`);
  }

  deepUpdate(object, parsed);
  return object;
}

export function compareXmlObject(parsedObject, expectedObject) {
  if (!parsedObject || !expectedObject) return false;
  if (parsedObject.tagName !== expectedObject.tagName) return false;

  const parsedAttrs = parsedObject.attributes || {};
  const expectedAttrs = expectedObject.attributes || {};
  const keys = new Set([...Object.keys(parsedAttrs), ...Object.keys(expectedAttrs)]);
  for (const key of keys) {
    if (parsedAttrs[key] !== expectedAttrs[key]) return false;
  }

  const parsedChildren = parsedObject.children || [];
  const expectedChildren = expectedObject.children || [];
  if (parsedChildren.length !== expectedChildren.length) return false;

  for (let i = 0; i < parsedChildren.length; i += 1) {
    const p = parsedChildren[i];
    const e = expectedChildren[i];
    if (p.text || e.text) {
      if (p.text !== e.text) return false;
      continue;
    }
    if (!compareXmlObject(p, e)) return false;
  }

  return true;
}


