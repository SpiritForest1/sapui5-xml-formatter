export type XmlNode = {
	tagName: string;
	attributes?: Record<string, string>;
	children?: Array<XmlNode | { text: string }>;
};

function normalizeString(value: string) {
	// Collapse whitespace first
	const collapsed = value.replaceAll(/\s+/g, ' ');

	// Process character by character to only modify content outside string literals
	let result = '';
	let i = 0;
	while (i < collapsed.length) {
		const ch = collapsed[i];
		if (ch === "'" || ch === '"') {
			// Collect the full string, normalizing single-quotes to double-quotes
			let str = '"';
			i++;
			while (i < collapsed.length && collapsed[i] !== ch) {
				if (collapsed[i] === '\\') {
					str += collapsed[i];
					i++;
				}
				str += collapsed[i];
				i++;
			}
			str += '"';
			i++; // skip closing quote
			result += str;
		} else {
			result += ch;
			i++;
		}
	}

	// Quote unquoted object keys (word characters followed by optional space and colon, outside strings)
	// We process again token-by-token so we don't accidentally quote inside strings
	let quoted = '';
	let j = 0;
	while (j < result.length) {
		const ch = result[j];
		if (ch === '"') {
			// Skip over string
			quoted += ch;
			j++;
			while (j < result.length && result[j] !== '"') {
				if (result[j] === '\\') {
					quoted += result[j];
					j++;
				}
				quoted += result[j];
				j++;
			}
			quoted += '"';
			j++;
		} else if (/\w/.test(ch)) {
			// Collect word
			let word = '';
			while (j < result.length && /\w/.test(result[j])) {
				word += result[j];
				j++;
			}
			// Check if followed by optional spaces then colon (object key pattern)
			let k = j;
			while (k < result.length && result[k] === ' ') k++;
			if (k < result.length && result[k] === ':' && result[k + 1] !== ':') {
				quoted += `"${word}"`;
			} else {
				quoted += word;
			}
		} else {
			quoted += ch;
			j++;
		}
	}

	return quoted;
}

function isParsable(value: string) {
	const normalizedString = normalizeString(value);
	try {
		JSON.parse(normalizedString);
		return true;
	} catch {
		return false;
	}
}

function formatCompactValue(value: string): string {
	const normalized = normalizeString(value);
	if (!isParsable(value)) {
		return value;
	}
	const jsValue = JSON.parse(normalized);
	if (typeof jsValue === 'string') {
		return `'${jsValue}'`;
	} else if (typeof jsValue === 'boolean' || typeof jsValue === 'number') {
		return String(jsValue);
	} else if (jsValue === null) {
		return 'null';
	} else if (isObject(jsValue)) {
		const parts: string[] = [];
		for (const key in jsValue) {
			parts.push(`${key}: ${formatCompactValue(JSON.stringify((jsValue as any)[key]))}`);
		}
		return `{ ${parts.join(', ')} }`;
	} else if (Array.isArray(jsValue)) {
		return `[${jsValue.map(item => formatCompactValue(JSON.stringify(item))).join(', ')}]`;
	}
	return value;
}

function formatMultilineValue(value: string, indent: string, optionsIndent: string, compact?: boolean): string {
	let result = "";
	const formattedValue = normalizeString(value);

	if (!isParsable(value)) {
		return value;
	}

	const jsValue = JSON.parse(formattedValue);
	if (typeof jsValue === 'string') {
		return `'${jsValue}'`;
	} else if (typeof jsValue === 'boolean') {
		return value;
	} else if (typeof jsValue === 'number') {
		return `${jsValue}`;
	} else if (jsValue === null) {
		return 'null';
	} else if (isObject(jsValue)) {
		const arr: string[] = [];
		result += `{\n`;
		for (const key in jsValue) {
			const resultingIndent = indent ? indent + optionsIndent : optionsIndent.repeat(2);
			const xmlObjKey = resultingIndent + key;
			const xmlObjValue = formatMultilineValue(JSON.stringify((jsValue as any)[key]), resultingIndent, optionsIndent, compact);
			arr.push(`${xmlObjKey}: ${xmlObjValue}`);
		}
		result += arr.join(`,\n`);
		result += `\n${indent ? indent : optionsIndent.repeat(2)}` + `}`;
	} else if (Array.isArray(jsValue)) {
		const arr: string[] = [];
		result += `[\n`;
		for (const item of jsValue) {
			if (compact) {
				arr.push(`${indent}${optionsIndent}${formatCompactValue(JSON.stringify(item))}`);
			} else {
				const formattedItem = formatMultilineValue(JSON.stringify(item), indent, optionsIndent);
				if (formattedItem.includes('\n')) {
					const itemLines = formattedItem.split('\n');
					const adjustedLines = itemLines.map((line, index) => {
						if (index === 0) {
							return line;
						}
						if (index === itemLines.length - 1) {
							return `${indent}${optionsIndent}${line.trimStart()}`;
						}
						return `${optionsIndent}${line}`;
					});
					arr.push(`${indent}${optionsIndent}${adjustedLines.join('\n')}`);
				} else {
					arr.push(`${indent}${optionsIndent}${formattedItem}`);
				}
			}
		}
		result += arr.join(`,\n`);
		result += `\n${indent}` + `]`;
	}

	return result;
}

function isObject(value: unknown) {
	return Boolean(value && !Array.isArray(value) && typeof value === 'object');
}

function escapeXmlAmpersands(value: string) {
	return value.replace(/&(?!((amp|lt|gt|apos|quot|#[0-9]+|#x[0-9A-Fa-f]+);))/g, '&amp;');
}

function indentFromString(indent: string) {
	return indent.replace(/\t/g, '    ').length;
}

function spaces(n: number) {
	return ' '.repeat(Math.max(0, n));
}

function isExpressionBinding(value: string) {
	return Boolean(value && typeof value === 'string') && /^{\s*=/.test(value);
}

function splitTopLevelCommas(value: string): string[] {
	const parts: string[] = [];
	let current = '';
	let depth = 0;
	let quote: string | null = null;
	for (let i = 0; i < value.length; i++) {
		const ch = value[i];
		if (quote) {
			current += ch;
			if (ch === quote && value[i - 1] !== '\\') {
				quote = null;
			}
			continue;
		}

		if (ch === '"' || ch === "'") {
			quote = ch;
			current += ch;
			continue;
		}

		if (ch === '{' || ch === '[' || ch === '(') {
			depth++;
			current += ch;
			continue;
		}
		if (ch === '}' || ch === ']' || ch === ')') {
			depth = Math.max(0, depth - 1);
			current += ch;
			continue;
		}

		if (ch === ',' && depth === 0) {
			parts.push(current.trim());
			current = '';
			continue;
		}

		current += ch;
	}
	if (current.trim()) {
		parts.push(current.trim());
	}
	return parts;
}

function reindentBindingValue(value: string, baseIndent: string, optionsIndent: string): string {
	const lines = value.split('\n');
	if (lines.length <= 1) {
		return value;
	}

	const attrIndent = baseIndent + optionsIndent;
	const innerIndent = attrIndent + optionsIndent;

	const resultLines: string[] = [];
	resultLines.push(lines[0].trimEnd());

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		if (trimmed === '') {
			resultLines.push('');
			continue;
		}

		if (i === lines.length - 1) {
			resultLines.push(attrIndent + trimmed);
		} else {
			resultLines.push(innerIndent + trimmed);
		}
	}

	return resultLines.join('\n');
}

function reindentObjectAttribute(value: string, baseIndent: string, optionsIndent: string, compact?: boolean): string {
	const openIndex = value.indexOf('{');
	const closeIndex = value.lastIndexOf('}');
	if (openIndex === -1 || closeIndex === -1 || closeIndex <= openIndex) {
		return value;
	}

	const prefix = value.slice(0, openIndex).trimEnd();
	const inner = value.slice(openIndex + 1, closeIndex).trim();

	// Only format object-like attribute content, not simple bindings or values
	if (!inner.includes(':') && !inner.startsWith('{') && !inner.startsWith('[')) {
		return value;
	}

	const attrIndent = baseIndent;
	const innerIndent = attrIndent + optionsIndent;

	// Attempt to parse as object for richer formatting with arrays/objects.
	const structuredCandidate = `{${inner}}`;
	if (isParsable(structuredCandidate)) {
		const parsed = JSON.parse(normalizeString(structuredCandidate));
		if (isObject(parsed)) {
			const formatted = formatMultilineValue(
				JSON.stringify(parsed),
				spaces(indentFromString(attrIndent)),
				optionsIndent,
				compact
			);
			const formattedLines = formatted.split('\n');
			const resultLines: string[] = [];
			const firstLine = prefix ? `${prefix} ${formattedLines[0]}` : formattedLines[0];
			resultLines.push(firstLine);
			for (let i = 1; i < formattedLines.length; i++) {
				resultLines.push(formattedLines[i]);
			}
			return resultLines.join('\n');
		}
	}

	const parts = splitTopLevelCommas(inner);

	const openBrace = prefix ? `${prefix} {` : '{';
	const inlineExpression = prefix ? `${prefix} { ${parts[0]} }` : `{ ${parts[0]} }`;

	if (parts.length === 0) {
		return prefix ? `${prefix} {}` : '{}';
	}

	if (parts.length === 1) {
		return inlineExpression;
	}

	const lines: string[] = [];
	lines.push(openBrace);
	for (let i = 0; i < parts.length; i++) {
		const trailingComma = i < parts.length - 1 ? ',' : '';
		lines.push(`${innerIndent}${parts[i]}${trailingComma}`);
	}

	return `${lines.join('\n')}\n${attrIndent}}`;
}

export async function formatXml(xml: string, options: { indent: string; sortAttributes: boolean; compactBinding?: boolean }): Promise<string> {
	const { parseXML } = await import('xml_parser');
	const parsed = parseXML(xml);
	if (!parsed) {
		return '';
	}

	const formatted = formatNode(parsed, 0, options);
	return formatted.trim() + '\n';
}

function formatNode(node: XmlNode, level: number, options: { indent: string; sortAttributes: boolean; compactBinding?: boolean }): string {
	const indent = options.indent.repeat(level);
	let result = '';

	const tagName = node.tagName;
	const attrs: string[] = [];
	const attrMap = node.attributes || {};
	const keys = Object.keys(attrMap);
	if (options.sortAttributes) keys.sort();

	for (const key of keys) {
		let value = attrMap[key];
		if (isExpressionBinding(value)) {
			value = value.replace(/&&/g, '&amp;&amp;');
			value = escapeXmlAmpersands(value);
			value = reindentBindingValue(value, indent, options.indent);
			attrs.push(`\n${indent}${options.indent}${key}="${value}"`);
		} else {
			value = value.replace(/&&/g, '&amp;&amp;');
			value = escapeXmlAmpersands(value);
			if (value.includes('{') && value.includes('}')) {
				value = reindentObjectAttribute(value, `${indent}${options.indent}`, options.indent, options.compactBinding);
			}
			if (value.includes('\n')) {
				attrs.push(`
${indent}${options.indent}${key}="${value}"`);
			} else if (isParsable(value)) {
				attrs.push(`
${indent}${options.indent}${key}="${formatMultilineValue(value, indent, options.indent, options.compactBinding)}"`);
			} else if (keys.length === 1) {
				attrs.push(` ${key}="${value}"`);
			} else {
				attrs.push(`
${indent}${options.indent}${key}="${value}"`);
			}
		}
	}

	const childElements = (node.children || []).filter((c): c is XmlNode => Boolean((c as XmlNode).tagName));
	const textContent = (node.children || [])
		.filter((c): c is { text: string } => 'text' in c && (c as any).text?.trim())
		.map((c) => (c as { text: string }).text.trim())
		.join(' ');

	result += indent + `<${tagName}`;
	if (attrs.length > 0) result += attrs.join('');
	result += '>';

	if (childElements.length > 0) {
		result += '\n';
		for (const child of childElements) {
			result += formatNode(child, level + 1, options) + '\n\n';
		}
		result = result.trimEnd() + '\n';
		result += indent + `</${tagName}>`;
	} else if (textContent) {
		result += textContent + `</${tagName}>`;
	} else {
		result = result.replace(/>$/, ' />');
	}

	return result;
}
export {
	normalizeString,
	isParsable,
	formatMultilineValue,
	isObject,
	escapeXmlAmpersands,
	isExpressionBinding,
	splitTopLevelCommas,
	reindentBindingValue,
	reindentObjectAttribute,
};