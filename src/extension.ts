import * as vscode from "vscode";
import { formatXml } from "./formatter";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerDocumentFormattingEditProvider("xml", {
			async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
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
				const formatted = await formatXml(fullText, {
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
