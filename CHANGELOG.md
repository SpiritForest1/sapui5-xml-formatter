# Change Log

All notable changes to the "xml-formatter" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.5] - 2026-03-11

### Added
- Custom indentation support (spaces or tabs, configurable via settings or editor defaults)
- Attribute sorting alphabetically (enabled by default)
- Multiline formatting for complex attribute values (JSON objects and arrays)
- Preservation of SAPUI5 expression bindings (e.g., `{= ...}`)
- Automatic self-closing tags for empty elements
- Blank lines between sibling elements for improved readability
- Support for XML, XSD, XSLT, and XAML file extensions