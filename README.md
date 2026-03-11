# XML Formatter

XML Formatter is a Visual Studio Code extension used to format SAPUI5 XML views with custom indentation, attributes on new lines, multiline value handling, and optional attribute sorting.

## Features

- **Custom Indentation**: Supports both spaces and tabs for indentation, configurable via settings or editor defaults.
- **Attribute Formatting**: Places attributes on new lines for better readability, with optional alphabetical sorting.
- **Multiline Value Handling**: Formats complex attribute values (like JSON objects and arrays) across multiple lines with proper indentation.
- **Expression Binding Support**: Preserves the formatting of SAPUI5 expression bindings (e.g., `{= ...}`).
- **Self-Closing Tags**: Automatically uses self-closing tags for empty elements.
- **Blank Lines**: Adds blank lines between sibling elements for improved structure.

## Requirements

- Visual Studio Code version 1.100.0 or higher.

## Extension Settings

This extension contributes the following settings:

* `xmlFormatter.indentWithSpaces`: Enable/disable the use of spaces instead of tabs for indentation. Defaults to the editor's `editor.insertSpaces` setting.
* `xmlFormatter.indentSize`: Number of spaces to use when `indentWithSpaces` is true. Defaults to the editor's `editor.tabSize` setting.
* `xmlFormatter.sortAttributes`: Sort attributes alphabetically. Defaults to `true`.

## Known Issues

None reported at this time.

## Release Notes

### 0.0.5

- Initial release with basic XML formatting features.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
