import { expect } from 'chai';
import {
  formatXml,
  normalizeString,
  isParsable,
  formatMultilineValue,
  isObject,
  escapeXmlAmpersands,
  isExpressionBinding,
  splitTopLevelCommas,
  reindentBindingValue,
  reindentObjectAttribute,
} from '../formatter';

describe('xml formatter', () => {
  it('formats input attributes on new lines and keeps multiline expression-binding values', async () => {
    const source = `<Input
    liveChange=".onLiveChange"
    value="{/InputValue2}" visible="{= \${model>/path} &amp;&amp;\n    \${model>/path2}\n    }" />`;

    const expected = '<Input\n'
      + '    liveChange=".onLiveChange"\n'
      + '    value="{/InputValue2}"\n'
      + '    visible="{= \${model>/path} &amp;&amp;\n'
      + '        \${model>/path2}\n'
      + '    }" />\n';

    const formatted = await formatXml(source, { indent: '    ', sortAttributes: true });
    expect(formatted).to.equal(expected);
  });

  it('does not add a leading space after =" for object attributes', async () => {
    const source = `<Table
    id="subprojectsTable"
    items="{path:'ToSubprojects', parameters : {expand:'ToContentGrps,ToLanguages'}, templateShareable: false }"
    itemPress=".onSelectSubproject"
    includeItemInSelection="true"
    mode="SingleSelectMaster"
    noDataText="{i18n>no_subprojects}"
    width="100%"
    growing="true"
    growingThreshold="40"
    growingScrollToLoad="true"/>`;

    const formatted = await formatXml(source, { indent: '    ', sortAttributes: true });
    expect(formatted).to.include('items="{\n');
    expect(formatted).to.not.include('items=" {\n');
  });

  it('formats table items object attribute without a pre-space in object literal', async () => {
    const source = `  <Table
    id="subprojectsTable"
    items="{path:'ToSubprojects', parameters : {expand:'ToContentGrps,ToLanguages'}, templateShareable: false }"
    itemPress=".onSelectSubproject"
    includeItemInSelection="true"
    mode="SingleSelectMaster"
    noDataText="{i18n>no_subprojects}"
    width="100%"
    growing="true"
    growingThreshold="40"
    growingScrollToLoad="true">
  </Table>`;

    const formatted = await formatXml(source, { indent: '    ', sortAttributes: true });
    expect(formatted).to.include('items="{\n');
    expect(formatted).to.not.include('items=" {\n');

    const expandLine = formatted.split('\n').find((line) => line.trim().startsWith('expand:'));
    expect(expandLine).to.exist;
    expect(expandLine).to.match(/^\s{12}expand/);
  });

  it('formats table items multiline object and keeps brace alignment', async () => {
    const source = `<Table
        growing="true"
        growingScrollToLoad="true"
        growingThreshold="40"
        id="subprojectsTable"
        includeItemInSelection="true"
        itemPress=".onSelectSubproject"
        items="{path:'ToSubprojects', parameters:{expand:'ToContentGrps,ToLanguages'}, templateShareable:false}"
        mode="SingleSelectMaster"
        noDataText="{i18n>no_subprojects}"
        width="100%" />`;

    const expected = `<Table
    growing="true"
    growingScrollToLoad="true"
    growingThreshold="40"
    id="subprojectsTable"
    includeItemInSelection="true"
    itemPress=".onSelectSubproject"
    items="{\n        path: 'ToSubprojects',\n        parameters: {\n            expand: 'ToContentGrps,ToLanguages'\n        },\n        templateShareable: false\n    }"
    mode="SingleSelectMaster"
    noDataText="{i18n>no_subprojects}"
    width="100%" />\n`;

    const formatted = await formatXml(source, { indent: '    ', sortAttributes: true });
    expect(formatted).to.equal(expected);
  });

  describe('formatter helper methods', () => {
    it('normalizeString and isParsable behavior', () => {
      expect(normalizeString("{a: 1, b:'x'}")).to.equal('{"a": 1, "b":"x"}');
      expect(isParsable('{"a": 1, "b":"x"}')).to.be.true;
      expect(isParsable('not json')).to.be.false;
    });

    it('formatMultilineValue and isObject behavior', () => {
      expect(isObject({})).to.be.true;
      expect(isObject([])).to.be.false;
      expect(formatMultilineValue('{"a":1}', '    ', '    ')).to.contain('a: 1');
      expect(formatMultilineValue('"test"', '    ', '    ')).to.equal("'test'");
      expect(formatMultilineValue('true', '    ', '    ')).to.equal('true');
      expect(formatMultilineValue('123', '    ', '    ')).to.equal('123');
      expect(formatMultilineValue('null', '    ', '    ')).to.equal('null');
    });

    it('escapeXmlAmpersands and isExpressionBinding', () => {
      expect(escapeXmlAmpersands('A & B')).to.equal('A &amp; B');
      expect(escapeXmlAmpersands('A &amp; B')).to.equal('A &amp; B');
      expect(isExpressionBinding('{= ${model>/path}}')).to.be.true;
      expect(isExpressionBinding('{model>/path}')).to.be.false;
    });

    it('splitTopLevelCommas for nested objects', () => {
      const parts = splitTopLevelCommas("a, {b:1, c:2}, d");
      expect(parts).to.deep.equal(['a', '{b:1, c:2}', 'd']);
    });

    it('reindentBindingValue and reindentObjectAttribute', () => {
      const binding = '{= x &&\n    y\n}';
      const reindented = reindentBindingValue(binding, '    ', '    ');
      expect(reindented).to.equal('{= x &&\n            y\n        }');

      const obj = '.onLiveChange { parts: [\'/InputValue2\', \'/InputValue\'], formatter: \' .formatter.getValueLiveUpdate\' }';
      const oRe = reindentObjectAttribute(obj, '    ', '    ');
      console.log('DEBUG oRe', JSON.stringify(oRe));
      expect(oRe).to.equal(".onLiveChange {\n        parts: [\n            '/InputValue2',\n            '/InputValue'\n        ],\n        formatter: ' .formatter.getValueLiveUpdate'\n    }");

      const objMultiLine = '.onLiveChange { parts: [ {path: \'/InputValue2\'}, {path: \'/InputValue\'} ] }';
      const objMultiLineResult = reindentObjectAttribute(objMultiLine, '    ', '    ');
      expect(objMultiLineResult).to.equal(
        ".onLiveChange {\n        parts: [\n            {\n                path: '/InputValue2'\n            },\n            {\n                path: '/InputValue'\n            }\n        ]\n    }"
      );

      const objNoPrefix = '{path:\'/InputValue2\', formatter:\'x\'}';
      const objNoPrefixResult = reindentObjectAttribute(objNoPrefix, '    ', '    ');
      expect(objNoPrefixResult.startsWith('{')).to.be.true;
      expect(objNoPrefixResult).to.not.include(' =');
      expect(objNoPrefixResult).to.not.include(' {');

      const nonParsableNoPrefix = '{path: 1, invalidStyle: func() }';
      const nonParsableResult = reindentObjectAttribute(nonParsableNoPrefix, '    ', '    ');
      expect(nonParsableResult.startsWith('{')).to.be.true;
      expect(nonParsableResult).to.not.include(' {');
    });
  });

  it('escapes raw ampersand in attribute values to &amp;', async () => {
    const source = `<Test foo="A & B"/>`;
    const expected = `<Test foo="A &amp; B" />\n`;

    const formatted = await formatXml(source, { indent: '    ', sortAttributes: true });
    expect(formatted).to.equal(expected);
  });

  it('reformats liveChange object parameter expression values with multiline indentation', async () => {
    const source = `<Input
    liveChange=".onLiveChange { parts: [
            '/InputValue2',
            '/InputValue'
        ], formatter: '.formatter.getValueLiveUpdate' }"
    value="{/InputValue2}"
    visible="{= \${model>/path} &amp;&amp;
        \${model>/path2}
    }" />`;
    const expected = `<Input
    liveChange=".onLiveChange {\n        parts: [\n            '/InputValue2',\n            '/InputValue'\n        ],\n        formatter: '.formatter.getValueLiveUpdate'\n    }"
    value="{/InputValue2}"
    visible="{= \${model>/path} &amp;&amp;
        \${model>/path2}
    }" />\n`;

    const formatted = await formatXml(source, { indent: '    ', sortAttributes: true });
    expect(formatted).to.equal(expected);
  });

  it('reformats liveChange multi-line object literal with opening brace line break (desired style)', async () => {
    const source = `<Input\n    liveChange=".onLiveChange { \n        parts: [
            '/InputValue2',
            '/InputValue'
        ],\n        formatter: '.formatter.getValueLiveUpdate'\n    }"\n    value="{/InputValue2}"\n    visible="{= \${model>/path} &amp;&amp;\n        \${model>/path2}\n    }" />`;
    const expected = `<Input\n    liveChange=".onLiveChange {\n        parts: [
            '/InputValue2',
            '/InputValue'
        ],\n        formatter: '.formatter.getValueLiveUpdate'\n    }"\n    value="{/InputValue2}"\n    visible="{= \${model>/path} &amp;&amp;\n        \${model>/path2}\n    }" />\n`;

    const formatted = await formatXml(source, { indent: '    ', sortAttributes: true });
    expect(formatted).to.equal(expected);
  });

  it('reformats liveChange with multiline nested parts array containing objects', async () => {
    const source = `<Input\n    liveChange=".onLiveChange {\n                parts: [ {path: '/InputValue2'}, \n    {path: '/InputValue'}\n    ],\n                formatter: '.formatter.getValueLiveUpdate'\n            }"\n    value="{/InputValue2}"\n    visible="{= \${model>/path} &amp;&amp;\n        \${model>/path2}\n    }" />`;
    const expected = `<Input\n    liveChange=".onLiveChange {\n        parts: [\n            {\n                path: '/InputValue2'\n            },\n            {\n                path: '/InputValue'\n            }\n        ],\n        formatter: '.formatter.getValueLiveUpdate'\n    }"\n    value="{/InputValue2}"\n    visible="{= \${model>/path} &amp;&amp;\n        \${model>/path2}\n    }" />\n`;

    const formatted = await formatXml(source, { indent: '    ', sortAttributes: true });
    expect(formatted).to.equal(expected);
  });

  it('reindents multiline SAPUI5 binding expressions so continued lines are indented', async () => {
    const source = `<Input\n    liveChange=".onLiveChange"\n    value="{/InputValue2}" visible="{= \${model>/path} &amp;&amp;\n    \${model>/path2}\n    }" />`;
    const expected = `<Input\n    liveChange=".onLiveChange"\n    value="{/InputValue2}"\n    visible="{= \${model>/path} &amp;&amp;\n        \${model>/path2}\n    }" />\n`;

    const formatted = await formatXml(source, { indent: '    ', sortAttributes: true });
    expect(formatted).to.equal(expected);
  });
});
