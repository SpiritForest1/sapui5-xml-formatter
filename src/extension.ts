import * as vscode from "vscode";
import { DOMParser } from "@xmldom/xmldom";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerDocumentFormattingEditProvider("xml", {
			provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
				const config = vscode.workspace.getConfiguration("xmlFormatter");
				const defaultConfig = vscode.workspace.getConfiguration("editor", document.uri);
				const sortAttributes = config.get<boolean>("sortAttributes", true);
				let useSpaces = config.get<boolean|undefined>("indentWithSpaces");
				let indentSize = config.get<number|undefined>("indentSize");
				
				const editor = vscode.window.activeTextEditor;
				if (editor) {
					useSpaces = editor.options.insertSpaces as boolean | undefined;
					indentSize = editor.options.tabSize as number | undefined;
				}

				if (useSpaces === undefined) {
					useSpaces = defaultConfig.get<boolean>("insertSpaces", true)
				}

				if (indentSize === undefined) {
					indentSize = defaultConfig.get<number>("tabSize", 4)
				}

				const fullText = document.getText();
				const formatted = formatXml(fullText, {
					indent: useSpaces ? " ".repeat(indentSize) : "\t",
					sortAttributes
				});

				const range = new vscode.Range(
					document.positionAt(0),
					document.positionAt(fullText.length)
				);

				return [vscode.TextEdit.replace(range, formatted)];
			}
		})
	);
}

export function deactivate() {}

function formatXml(xml: string, options: { indent: string; sortAttributes: boolean }): string {
	const parser = new DOMParser();
	const doc = parser.parseFromString(xml, "text/xml");

	const formatted = formatNode(doc.documentElement, 0, options);
	return formatted.trim() + "\n";
}

function formatNode(
	node: Element,
	level: number,
	options: { indent: string; sortAttributes: boolean }
): string {
	const indent = options.indent.repeat(level);
	let result = "";

	// Tag name
	const tagName = node.tagName;

	// Attributes
	const attrs: string[] = [];
	const attrMap = node.attributes;
	const keys: string[] = [];
	for (let i = 0; i < attrMap.length; i++) {
		keys.push(attrMap[i].name);
	}
	if (options.sortAttributes) keys.sort();

	for (const key of keys) {
		const value = attrMap.getNamedItem(key)!.value;
		if (key === "visible") debugger;
		if (isParsable(value)) {
			attrs.push(
				`\n${indent}${options.indent}${key}="${formatMultilineValue(value, indent, options.indent)}"`
			);
		} else if (isExpressionBinding(value)) {
			// don't format expression bindings
			attrs.push(` ${key}="${value}"`);
		} else if (keys.length === 1) {
			attrs.push(` ${key}="${value}"`);
		} else {
			attrs.push(`\n${indent}${options.indent}${key}="${value}"`);
		}
	}

	// Children
	const childElements: Element[] = [];
	let textContent: string | null = null;
	for (let i = 0; i < node.childNodes.length; i++) {
		const child = node.childNodes[i];
		if (child.nodeType === 1) {
			childElements.push(child as Element);
		} else if (child.nodeType === 3) {
			const trimmed = child.nodeValue?.trim();
			if (trimmed) textContent = trimmed;
		}
	}

	// Opening tag
	result += indent + `<${tagName}`;
	if (attrs.length > 0) result += attrs.join("");
	result += ">";

	if (childElements.length > 0) {
		result += "\n";
		for (const child of childElements) {
			result += formatNode(child, level + 1, options) + "\n\n"; // blank line between siblings
		}
		result = result.trimEnd() + "\n";
		result += indent + `</${tagName}>`;
	} else if (textContent) {
		result += textContent + `</${tagName}>`;
	} else {
		// self-closing
		result = result.replace(/>$/, " />");
	}

	return result;
}

function normalizeString (value: string) {
	return value.replaceAll(/\s+/g, ' ') // replace spaces
		.replaceAll(/'/g, "\"") // replace single quotes with doble quotes for JSON parser
		.replaceAll(/(\w+(?=:))/g, "\"$1\""); // object properties should be wrapped into double quotes as well
}

function isParsable (value: string) {
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
	if (typeof jsValue === "string") {
		return `'${jsValue}'`;
	} else if (typeof jsValue === "boolean") {
		return value;
	} else if (isObject(jsValue)) {
		const arr = [];
		result += `{\n`;
		for (const key in jsValue) {
			const resultingIndent = indent + optionsIndent.repeat(2);
			const xmlObjKey = resultingIndent + key;
			const xmlObjValue = formatMultilineValue(
				JSON.stringify(jsValue[key]), 
				resultingIndent, 
				optionsIndent
			);
			arr.push(`${xmlObjKey}: ${xmlObjValue}`);
		}
		result += arr.join(`,\n`);
		result += `\n${indent}${optionsIndent}}`
	} else if (Array.isArray(jsValue)) {
		const arr = [];
		result += `[\n`;
		for (const item of jsValue) {
			arr.push(`${indent}${optionsIndent}${formatMultilineValue(JSON.stringify(item), indent, optionsIndent)}`)
		}
		
		result += arr.join(`,\n`);
		result += `\n${indent}]`;
	}

	return result;
}

function isObject (value: unknown) {
	return Boolean(value && !Array.isArray(value) && typeof value === "object");
}

function isExpressionBinding (value: string) {
	return Boolean(value && typeof value === "string") && /^{\s*=/.test(value);
}
