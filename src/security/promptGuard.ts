import { randomUUID } from 'node:crypto';

export const PROMPT_GUARD_LIMITS = Object.freeze({
  maxMessageChars: 2_000,
  maxHistoryEntries: 20,
  maxHistoryChars: 12_000,
  maxLines: 80,
  maxBracketDepth: 8,
  maxDelimiterPairs: 80,
  maxInvisibleCharacters: 4,
});

export type PromptGuardSignal =
  | 'CONTROL_CHARACTERS'
  | 'ENCODED_PAYLOAD'
  | 'EXCESSIVE_DELIMITERS'
  | 'EXCESSIVE_LINES'
  | 'HIDDEN_UNICODE'
  | 'INSTRUCTION_OVERRIDE'
  | 'PROMPT_DISCLOSURE'
  | 'ROLE_INJECTION'
  | 'STRUCTURE_DEPTH';

export interface PromptGuardAllowed {
  allowed: true;
  auditId: string;
  normalizedText: string;
  signals: PromptGuardSignal[];
}

export interface PromptGuardRejected {
  allowed: false;
  auditId: string;
  code: 'EMPTY_MESSAGE' | 'MESSAGE_TOO_LARGE' | 'PROMPT_INJECTION' | 'STRUCTURE_TOO_COMPLEX';
  signals: PromptGuardSignal[];
}

export type PromptGuardDecision = PromptGuardAllowed | PromptGuardRejected;

const ROLE_MARKERS = [
  /(?:^|\n)\s*(?:system|developer|assistant)\s*:/iu,
  /(?:^|\n)\s*#{1,6}\s*(?:system|developer|assistant)\b/iu,
  /<\/?(?:system|developer|assistant|tool|function)(?:\s|>)/iu,
  /\[\/?(?:inst|system|assistant|developer)\]/iu,
  /["']role["']\s*:\s*["'](?:system|developer|assistant|tool)["']/iu,
];

const OVERRIDE_PATTERNS = [
  /\b(?:ignore|disregard|forget|override|bypass)\b.{0,80}\b(?:previous|prior|system|developer|security|safety|instruction|rules?)\b/iu,
  /\b(?:ignoriere|missachte|vergiss|überschreibe|umgehe)\b.{0,80}\b(?:vorherige|bisherige|system|entwickler|sicherheits|anweisung|regeln?)\b/iu,
  /\b(?:you are now|act as|pretend to be)\b.{0,80}\b(?:system|developer|administrator|root|unrestricted)\b/iu,
  /\b(?:du bist jetzt|agiere als|tu so als)\b.{0,80}\b(?:system|entwickler|administrator|root|uneingeschränkt)\b/iu,
  /\b(?:decode|translate|transform|execute|follow)\b.{0,80}\b(?:hidden|embedded|following|enclosed)\b.{0,40}\b(?:instructions?|commands?|payload)\b/iu,
];

const DISCLOSURE_PATTERNS = [
  /\b(?:reveal|show|print|repeat|leak|exfiltrate)\b.{0,80}\b(?:system prompt|developer message|hidden instructions?|secrets?|api key|credentials?)\b/iu,
  /\b(?:zeige|drucke|wiederhole|enthülle|verrate|extrahiere)\b.{0,80}\b(?:systemprompt|entwicklernachricht|versteckte anweisungen|geheimnisse|api[- ]?schlüssel|zugangsdaten)\b/iu,
];

const ENCODED_PAYLOAD_PATTERNS = [
  /\b(?:data|javascript):[a-z0-9.+-]+[;,]/iu,
  /\b(?:base64|rot13|hex|unicode escape|url[- ]?decode)\b.{0,40}\b(?:decode|execute|follow|instruction|payload)\b/iu,
  /(?:^|\s)[A-Za-z0-9+/]{160,}={0,2}(?:\s|$)/u,
  /(?:\\u[0-9a-fA-F]{4}){12,}/u,
  /(?:%[0-9a-fA-F]{2}){20,}/u,
];

const HIDDEN_UNICODE_PATTERN = /[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/gu;
const DISALLOWED_CONTROL_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;

function countMatches(input: string, pattern: RegExp): number {
  return Array.from(input.matchAll(pattern)).length;
}

function inspectStructure(text: string): { depth: number; delimiters: number } {
  const openToClose: Record<string, string> = { '(': ')', '[': ']', '{': '}', '<': '>' };
  const closing = new Set(Object.values(openToClose));
  const stack: string[] = [];
  let maximumDepth = 0;
  let delimiters = 0;

  for (const character of text) {
    const expectedClose = openToClose[character];
    if (expectedClose) {
      stack.push(expectedClose);
      delimiters += 1;
      maximumDepth = Math.max(maximumDepth, stack.length);
    } else if (closing.has(character)) {
      if (stack.at(-1) === character) stack.pop();
      delimiters += 1;
    }
  }

  return { depth: maximumDepth, delimiters: Math.ceil(delimiters / 2) };
}

export function normalizeUntrustedText(input: string): {
  normalizedText: string;
  controlCharacterCount: number;
  invisibleCharacterCount: number;
} {
  const canonical = input.normalize('NFKC');
  const invisibleCharacterCount = countMatches(canonical, HIDDEN_UNICODE_PATTERN);
  const withoutInvisible = canonical.replace(HIDDEN_UNICODE_PATTERN, '');
  const controlCharacterCount = countMatches(withoutInvisible, DISALLOWED_CONTROL_PATTERN);
  const normalizedText = withoutInvisible
    .replace(DISALLOWED_CONTROL_PATTERN, '')
    .replace(/\r\n?/gu, '\n')
    .trim();

  return { normalizedText, controlCharacterCount, invisibleCharacterCount };
}

export function inspectUntrustedPrompt(input: unknown): PromptGuardDecision {
  const auditId = randomUUID();
  if (typeof input !== 'string') {
    return { allowed: false, auditId, code: 'EMPTY_MESSAGE', signals: [] };
  }

  if (input.length > PROMPT_GUARD_LIMITS.maxMessageChars) {
    return { allowed: false, auditId, code: 'MESSAGE_TOO_LARGE', signals: [] };
  }

  const { normalizedText, controlCharacterCount, invisibleCharacterCount } = normalizeUntrustedText(input);
  if (!normalizedText) {
    return { allowed: false, auditId, code: 'EMPTY_MESSAGE', signals: [] };
  }

  const signals = new Set<PromptGuardSignal>();
  if (controlCharacterCount > 0) signals.add('CONTROL_CHARACTERS');
  if (invisibleCharacterCount > 0) signals.add('HIDDEN_UNICODE');
  if (ROLE_MARKERS.some((pattern) => pattern.test(normalizedText))) signals.add('ROLE_INJECTION');
  if (OVERRIDE_PATTERNS.some((pattern) => pattern.test(normalizedText))) signals.add('INSTRUCTION_OVERRIDE');
  if (DISCLOSURE_PATTERNS.some((pattern) => pattern.test(normalizedText))) signals.add('PROMPT_DISCLOSURE');
  if (ENCODED_PAYLOAD_PATTERNS.some((pattern) => pattern.test(normalizedText))) signals.add('ENCODED_PAYLOAD');

  const lineCount = normalizedText.split('\n').length;
  if (lineCount > PROMPT_GUARD_LIMITS.maxLines) signals.add('EXCESSIVE_LINES');

  const structure = inspectStructure(normalizedText);
  if (structure.depth > PROMPT_GUARD_LIMITS.maxBracketDepth) signals.add('STRUCTURE_DEPTH');
  if (structure.delimiters > PROMPT_GUARD_LIMITS.maxDelimiterPairs) signals.add('EXCESSIVE_DELIMITERS');

  const signalList = [...signals];
  const directInjection = signals.has('ROLE_INJECTION')
    || signals.has('INSTRUCTION_OVERRIDE')
    || signals.has('PROMPT_DISCLOSURE')
    || signals.has('ENCODED_PAYLOAD');
  const excessiveStructure = signals.has('EXCESSIVE_LINES')
    || signals.has('STRUCTURE_DEPTH')
    || signals.has('EXCESSIVE_DELIMITERS')
    || invisibleCharacterCount > PROMPT_GUARD_LIMITS.maxInvisibleCharacters;

  if (directInjection) {
    return { allowed: false, auditId, code: 'PROMPT_INJECTION', signals: signalList };
  }
  if (excessiveStructure) {
    return { allowed: false, auditId, code: 'STRUCTURE_TOO_COMPLEX', signals: signalList };
  }

  return { allowed: true, auditId, normalizedText, signals: signalList };
}

export function sanitizeModelOutput(input: unknown, maxChars = 6_000): string {
  if (typeof input !== 'string') return '';
  const { normalizedText } = normalizeUntrustedText(input);
  return normalizedText.slice(0, maxChars);
}
