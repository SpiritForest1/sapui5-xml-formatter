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
* `xmlFormatter.compactBinding`: Format binding array items on a single line. Defaults to `false`.

When `compactBinding` is `false` (default), each property of an array item is placed on its own line:

```xml
<Text
    text="{
        parts: [
            {
                path: 'ReqDeliveryDate',
                type: 'sap.ui.model.type.Date',
                formatOptions: {
                    style: 'long'
                }
            },
            {
                path: 'ReqDeliveryTimezone'
            }
        ]
    }" />
```

When `compactBinding` is `true`, each array item is kept on a single line:

```xml
<Text
    text="{
        parts: [
            { path: 'ReqDeliveryDate', type: 'sap.ui.model.type.Date', formatOptions: { style: 'long' }},
            { path: 'ReqDeliveryTimezone' }
        ]
    }" />

## Known Issues

None reported at this time.

## Release Notes

### 0.0.9

- Fixed parsing of binding values containing `:` inside string literals (e.g. `'HH:mm'`).
- Added `compactBinding` setting.

### 0.0.5

- Initial release with basic XML formatting features.

---

**Enjoy!**
