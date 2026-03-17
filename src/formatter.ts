export type XmlNode = {
	tagName: string;
	attributes?: Record<string, string>;
	children?: Array<XmlNode | { text: string }>;
};

function normalizeString(value: string) {
	return value
		.replaceAll(/\s+/g, ' ')
		.replaceAll(/'/g, '"')
		.replaceAll(/(\w+)(?=\s*:)/g, '"$1"');
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

function formatMultilineValue(value: string, indent: string, optionsIndent: string): string {
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
			const xmlObjValue = formatMultilineValue(JSON.stringify((jsValue as any)[key]), resultingIndent, optionsIndent);
			arr.push(`${xmlObjKey}: ${xmlObjValue}`);
		}
		result += arr.join(`,\n`);
		result += `\n${indent ? indent : optionsIndent.repeat(2)}` + `}`;
	} else if (Array.isArray(jsValue)) {
		const arr: string[] = [];
		result += `[\n`;
		for (const item of jsValue) {
			const formattedItem = formatMultilineValue(JSON.stringify(item), indent, optionsIndent);
			if (formattedItem.includes('\n')) {
				const itemLines = formattedItem.split('\n');
				const adjustedLines = itemLines.map((line, index) => {
					if (index === 0 || index === itemLines.length - 1) {
						return line;
					}
					return `${optionsIndent}${line}`;
				});
				arr.push(`${indent}${optionsIndent}${adjustedLines.join('\n')}`);
			} else {
				arr.push(`${indent}${optionsIndent}${formattedItem}`);
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

function reindentObjectAttribute(value: string, baseIndent: string, optionsIndent: string): string {
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
				optionsIndent
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

export async function formatXml(xml: string, options: { indent: string; sortAttributes: boolean }): Promise<string> {
	const { parseXML } = await import('xml_parser');
	const parsed = parseXML(xml);
	if (!parsed) {
		return '';
	}

	const formatted = formatNode(parsed, 0, options);
	return formatted.trim() + '\n';
}

function formatNode(node: XmlNode, level: number, options: { indent: string; sortAttributes: boolean }): string {
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
				value = reindentObjectAttribute(value, `${indent}${options.indent}`, options.indent);
			}
			if (value.includes('\n')) {
				attrs.push(`
${indent}${options.indent}${key}="${value}"`);
			} else if (isParsable(value)) {
				attrs.push(`
${indent}${options.indent}${key}="${formatMultilineValue(value, indent, options.indent)}"`);
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