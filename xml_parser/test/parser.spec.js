import { expect } from 'chai';
import { isXmlString, parseTagName, parseXML, syncXmlObject, compareXmlObject } from '../src/parser.js';

describe('parser utility', () => {
  describe('isXmlString()', () => {
    it('returns true for simple xml', () => {
      expect(isXmlString('<root></root>')).to.be.true;
    });

    it('returns false for non-xml', () => {
      expect(isXmlString('hello')).to.be.false;
    });

    it('returns false for empty string', () => {
      expect(isXmlString('')).to.be.false;
    });
  });

  describe('parseTagName()', () => {
    it('extracts name from a root element', () => {
      expect(parseTagName('<root></root>')).to.equal('root');
    });

    it('throws on invalid XML', () => {
      expect(() => parseTagName('not xml')).to.throw('Invalid XML string');
    });
  });

  describe('parseXML()', () => {
    it('parses root element without children', () => {
      expect(parseXML('<root></root>')).to.be.an('object');
      expect(parseXML('<root></root>')).to.deep.equal({ tagName: 'root', attributes: {}, children: [] });
    });

    it('parses nested child elements', () => {
      expect(parseXML('<root><child></child></root>')).to.be.an('object');
      expect(parseXML('<root><child></child></root>')).to.deep.equal({ tagName: 'root', attributes: {}, children: [{ tagName: 'child', attributes: {}, children: [] }] });
    });

    it('parses namespace declaration as attribute', () => {
      expect(parseXML('<root xmlns="sap.m"></root>')).to.be.an('object');
      expect(parseXML('<root xmlns="sap.m"></root>')).to.deep.equal({ tagName: 'root', children: [], attributes: { xmlns: 'sap.m' } });
    });

    it('parses namespace declaration as attribute repeated', () => {
      expect(parseXML('<root xmlns="sap.m"></root>')).to.be.an('object');
      expect(parseXML('<root xmlns="sap.m"></root>')).to.deep.equal({ tagName: 'root', children: [], attributes: { xmlns: 'sap.m' } });
    });

    it('parses self-closing namespace root', () => {
      expect(parseXML('<root xmlns="sap.m"/>')).to.be.an('object');
      expect(parseXML('<root xmlns="sap.m"/>')).to.deep.equal({ tagName: 'root', children: [], attributes: { xmlns: 'sap.m' } });
    });

    it('performs structural sync and validation for complex XML', () => {
      const xml = `
      <mvc:View
          controllerName="sap.m.sample.TableMultiSelectMode.Table"
          xmlns:mvc="sap.ui.core.mvc"
          xmlns="sap.m"
          xmlns:core="sap.ui.core">
          <Table id="idProductsTable" inset="false" mode="MultiSelect" items="{ path: '/ProductCollection', sorter: { path: 'Name' } }">
            <headerToolbar>
              <OverflowToolbar>
                <Title text="Products" level="H2" />
                <ToolbarSpacer />
              </OverflowToolbar>
            </headerToolbar>
          </Table>
      </mvc:View>`;

      const parsed = parseXML(xml);
      expect(parsed).to.be.an('object');
      expect(parsed.tagName).to.equal('mvc:View');

      const expected = {
        tagName: 'mvc:View',
        attributes: {
          controllerName: 'sap.m.sample.TableMultiSelectMode.Table',
          'xmlns:mvc': 'sap.ui.core.mvc',
          xmlns: 'sap.m',
          'xmlns:core': 'sap.ui.core',
        },
        children: [
          {
            tagName: 'Table',
            attributes: {
              id: 'idProductsTable',
              inset: 'false',
              mode: 'MultiSelect',
              items: "{ path: '/ProductCollection', sorter: { path: 'Name' } }",
            },
            children: [
              {
                tagName: 'headerToolbar',
                attributes: {},
                children: [
                  {
                    tagName: 'OverflowToolbar',
                    attributes: {},
                    children: [
                      {
                        tagName: 'Title',
                        attributes: { text: 'Products', level: 'H2' },
                        children: [],
                      },
                      {
                        tagName: 'ToolbarSpacer',
                        attributes: {},
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      expect(parsed).to.deep.equal(expected);

      const target = { tagName: 'mvc:View', attributes: {}, children: [] };
      const synced = syncXmlObject(xml, target);

      expect(synced).to.deep.equal(expected);
      expect(compareXmlObject(parsed, synced)).to.be.true;
    });

    it('performs structural sync and validation for complex XML', () => {
      const xml = `
      <mvc:View
          controllerName="sap.m.sample.TableMultiSelectMode.Table"
          xmlns:mvc="sap.ui.core.mvc"
          xmlns="sap.m"
          xmlns:core="sap.ui.core">
          <Table id="idProductsTable" inset="false" mode="MultiSelect" items="{ path: '/ProductCollection', sorter: { path: 'Name' } }">
            <headerToolbar>
              <OverflowToolbar>
                <Title text="Products" level="H2" visible="{= \${local>/isVisible} &amp;&amp; \${local>/isEditable} }"/>
                <ToolbarSpacer />
              </OverflowToolbar>
            </headerToolbar>
          </Table>
      </mvc:View>`;

      const parsed = parseXML(xml);
      expect(parsed).to.be.an('object');
      expect(parsed.tagName).to.equal('mvc:View');

      const expected = {
        tagName: 'mvc:View',
        attributes: {
          controllerName: 'sap.m.sample.TableMultiSelectMode.Table',
          'xmlns:mvc': 'sap.ui.core.mvc',
          xmlns: 'sap.m',
          'xmlns:core': 'sap.ui.core',
        },
        children: [
          {
            tagName: 'Table',
            attributes: {
              id: 'idProductsTable',
              inset: 'false',
              mode: 'MultiSelect',
              items: "{ path: '/ProductCollection', sorter: { path: 'Name' } }",
            },
            children: [
              {
                tagName: 'headerToolbar',
                attributes: {},
                children: [
                  {
                    tagName: 'OverflowToolbar',
                    attributes: {},
                    children: [
                      {
                        tagName: 'Title',
                        attributes: { text: 'Products', level: 'H2', visible: '{= ${local>/isVisible} &amp;&amp; ${local>/isEditable} }' },
                        children: [],
                      },
                      {
                        tagName: 'ToolbarSpacer',
                        attributes: {},
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      expect(parsed).to.deep.equal(expected);

      const target = { tagName: 'mvc:View', attributes: {}, children: [] };
      const synced = syncXmlObject(xml, target);

      expect(synced).to.deep.equal(expected);
      expect(compareXmlObject(parsed, synced)).to.be.true;
    });
  });

});