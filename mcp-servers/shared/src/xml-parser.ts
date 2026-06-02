import { XMLParser } from 'fast-xml-parser';
import { McpError, ErrorCodes } from './error-handler.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
});

export function parseXmlSimple(xml: string): Record<string, unknown> {
  try {
    return parser.parse(xml);
  } catch {
    throw new McpError(ErrorCodes.ParseError, 'Failed to parse XML response');
  }
}
