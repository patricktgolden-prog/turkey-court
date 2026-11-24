/**
 * A small built-in guardrail so the starter works with zero setup.
 * It checks text on the way IN to the model and on the way OUT.
 *
 * Want a stronger one? Replace checkInput and checkOutput with calls to a
 * guardrail service such as Block Convey's PRISM. Keep the same return shape
 * and nothing else in the app has to change.
 */

export type GuardrailResult = {
  text: string
  blocked: boolean
  reason?: string
  redacted: string[]
}

const PERSONAL_INFO: { label: string; pattern: RegExp }[] = [
  { label: "email", pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { label: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: "card number", pattern: /\b(?:\d[ -]?){13,16}\b/g },
  { label: "phone", pattern: /(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b/g },
]

const INJECTION =
  /\b(ignore|forget|override|bypass)\b.{0,30}\b(rules|instructions|guardrails?|prompt)\b|\b(system prompt|developer mode|jailbreak)\b|\b(every|all|other) (users?|people|accounts?)('s)? (data|rows|plans|records)\b/i

// Turkey Pardon Court: nobody gets to claim they run the court.
const AUTHORITY =
  /\b(i'?m|i am|this is|speaking as) (the |an? |your )?(admin|administrator|judge|clerk|bailiff|developer|moderator|chief justice|staff)\b/i

// Turkey Pardon Court: a case can only argue for itself. No touching other cases or past rulings.
const CASE_TAMPER =
  /\b(change|switch|flip|overturn|reverse|edit|update|delete|reopen|undo)\b.{0,40}\b(ruling|case|verdict|decision|docket|sentence)\b|\b(pardon|rule|free|spare)\b.{0,25}\b(every|all|other)\b.{0,15}\b(turkeys?|cases|birds)\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i

// Turkey Pardon Court: bribes are flagged, not blocked, so the judge can rule "dinner" and say why.
const BRIBE: RegExp[] = [
  /\bbrib(e|es|ed|ing|ery)\b/i,
  /\bin it for (you|the judge|your honou?r)\b/i,
  /\bnobody (has to|needs to|will) know\b/i,
  /\$\s?\d+|\b\d+\s?(dollars|bucks)\b|\b(cash|venmo|cashapp|paypal|zelle)\b/i,
  /\b(pay|paying|tip|tipping|reward)\b.{0,15}\b(you|judge|your honou?r|the court)\b/i,
  /\b(pie|pies|gravy|stuffing|cookies?|cake|treats?|leftovers|wine|money|gift)\b.{0,60}\b(judge|your honou?r|for you|the court|you could have|you can have|yours)\b/i,
  /\b(judge|your honou?r)\b.{0,60}\b(pie|pies|gravy|stuffing|cookies?|cake|treats?|wine|money|gift)\b/i,
]

/** True when the case text looks like it is trying to buy the judge. */
export function detectBribe(text: string) {
  return BRIBE.some((pattern) => pattern.test(text))
}

const MAX_INPUT_LENGTH = 500

function redact(text: string) {
  const found: string[] = []
  let clean = text
  for (const { label, pattern } of PERSONAL_INFO) {
    clean = clean.replace(pattern, () => {
      if (!found.includes(label)) found.push(label)
      return `[${label} removed]`
    })
  }
  return { clean, found }
}

export function checkInput(raw: string): GuardrailResult {
  const text = raw.trim()

  if (!text) return { text, blocked: true, reason: "Type a goal first.", redacted: [] }
  if (text.length > MAX_INPUT_LENGTH) {
    return { text, blocked: true, reason: `Keep it under ${MAX_INPUT_LENGTH} characters.`, redacted: [] }
  }
  if (INJECTION.test(text)) {
    return {
      text,
      blocked: true,
      reason: "That looks like an attempt to get around the app's rules, so it was not sent to the AI.",
      redacted: [],
    }
  }

  if (AUTHORITY.test(text)) {
    return {
      text,
      blocked: true,
      reason: "Only the judge runs this court. Claims to be the admin, clerk, or judge are not sent to the AI.",
      redacted: [],
    }
  }
  if (CASE_TAMPER.test(text)) {
    return {
      text,
      blocked: true,
      reason: "A case can only argue for its own turkey. Changing rulings or other cases is not allowed.",
      redacted: [],
    }
  }

  const { clean, found } = redact(text)
  return { text: clean, blocked: false, redacted: found }
}

export function checkOutput(raw: string): GuardrailResult {
  const { clean, found } = redact(raw.trim())
  return { text: clean, blocked: false, redacted: found }
}
