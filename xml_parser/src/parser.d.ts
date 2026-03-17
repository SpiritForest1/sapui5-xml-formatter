export type XmlNode = {
  tagName: string;
  attributes?: Record<string, string>;
  children?: Array<XmlNode | { text: string }>;
};

export function isXmlString(text: string): boolean;
export function parseTagName(xml: string): string | null;
export function parseXML(xml: string): XmlNode;
export function syncXmlObject(xml: string, object: object): object;
export function compareXmlObject(parsedObject: object, expectedObject: object): boolean;
