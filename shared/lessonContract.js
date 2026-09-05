const text = (value) => typeof value === 'string' && value.trim().length > 0;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
// Generators sometimes emit null or empty strings for unused fields. These are
// safe to render; required fields below still need meaningful content.
const optionalText = (value) => value == null || typeof value === 'string';
const list = (value, check, min = 1) => Array.isArray(value) && value.length >= min && value.every(check);
// Token comparison ignores presentation punctuation/case while preserving accents
// and every repeated word. Apostrophes/hyphens split consistently in both inputs.
const tokens = (value) => typeof value === 'string' ? value.normalize('NFC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [] : [];
const sameWordTokens = (words, answer) => Array.isArray(words) && typeof answer === 'string'
  && tokens(words.join(' ')).length > 0
  && JSON.stringify(tokens(words.join(' ')).sort()) === JSON.stringify(tokens(answer).sort());
const distinctChoices = (options) => Array.isArray(options) && new Set(options.map((option) => tokens(typeof option === 'string' ? option.replace(/^[a-d][).:]\s*/i, '') : '').join(' '))).size === options.length;
const choices = (item) => list(item.options, text, 2) && distinctChoices(item.options) && Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex < item.options.length;

/** Validate content independently of transport metadata; old cached lessons remain usable. */
export function isLessonContent(value, type) {
  if (!object(value) || !text(value.title)) return false;
  if (!optionalText(value.objective)) return false;
  if (value.corpusWords !== undefined && !list(value.corpusWords, (w) => object(w) && Number.isInteger(w.rank) && w.rank >= 1 && text(w.word) && text(w.translation), 0)) return false;
  if (type === 'reading') return text(value.passage) && text(value.passageTranslation)
    && list(value.vocabulary, (v) => object(v) && text(v.word) && text(v.translation) && optionalText(v.exampleSentence) && optionalText(v.exampleTranslation))
    && list(value.questions, (q) => object(q) && text(q.question) && choices(q) && optionalText(q.explanation));
  if (type === 'speaking') return list(value.pronunciationCards, (c) => object(c) && text(c.word) && text(c.translation) && text(c.phoneticHint))
    && list(value.phrases, (p) => object(p) && text(p.phrase) && text(p.translation) && text(p.context))
    && list(value.dialogue, (d) => object(d) && text(d.speaker) && text(d.line) && text(d.translation));
  if (type !== 'writing') return false;
  return list(value.exercises, (e) => {
    if (!object(e) || !text(e.instruction)) return false;
    if (!optionalText(e.sentence) || !optionalText(e.word)) return false;
    if (e.words != null && !list(e.words, text, 0)) return false;
    if (e.acceptedAnswers != null && !list(e.acceptedAnswers, text, 0)) return false;
    if (!optionalText(e.explanation) || !optionalText(e.hint)) return false;
    if (e.corpusRank !== undefined && (!Number.isInteger(e.corpusRank) || e.corpusRank < 1)) return false;
    if (e.type === 'multiple-choice') return text(e.word) && choices(e);
    if (!text(e.answer)) return false;
    if (e.type === 'word-order') return list(e.words, text, 2) && sameWordTokens(e.words, e.answer)
      && (e.acceptedAnswers ?? []).every((answer) => sameWordTokens(e.words, answer));
    return ['translation', 'fill-in-blank'].includes(e.type) && text(e.sentence);
  });
}

/** Safe debugging metadata only: fixed field paths/types, never text or answers. */
export function describeLessonIssues(value, type) {
  const issues = [];
  const valueType = (v) => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'string' && !v.trim() ? 'empty string' : typeof v;
  const check = (valid, path, expected, actual) => { if (!valid && issues.length < 20) issues.push({ path, expected, received: valueType(actual) }); };
  const required = (entry, field, path) => check(text(entry?.[field]), `${path}.${field}`, 'nonempty string', entry?.[field]);
  const optional = (entry, field, path) => check(optionalText(entry?.[field]), `${path}.${field}`, 'optional string', entry?.[field]);
  const array = (items, path, inspect, min = 1) => {
    check(Array.isArray(items) && items.length >= min, path, `array with at least ${min} items`, items);
    if (!Array.isArray(items)) return;
    items.slice(0, 30).forEach((entry, index) => {
      check(object(entry), `${path}[${index}]`, 'object', entry);
      if (object(entry)) inspect(entry, `${path}[${index}]`);
    });
  };
  const choice = (entry, path) => {
    check(list(entry.options, text, 2), `${path}.options`, 'array with at least 2 nonempty strings', entry.options);
    if (list(entry.options, text, 2)) check(distinctChoices(entry.options), `${path}.options`, 'distinct options after ignoring case and punctuation', entry.options);
    check(Number.isInteger(entry.correctIndex) && entry.correctIndex >= 0 && entry.correctIndex < (entry.options?.length ?? 0), `${path}.correctIndex`, 'zero-based integer within options', entry.correctIndex);
  };
  check(object(value), '$', 'object', value);
  if (!object(value)) return issues;
  required(value, 'title', '$'); optional(value, 'objective', '$');
  if (value.corpusWords !== undefined) array(value.corpusWords, '$.corpusWords', (entry, path) => {
    check(Number.isInteger(entry.rank) && entry.rank >= 1, `${path}.rank`, 'positive integer', entry.rank);
    required(entry, 'word', path); required(entry, 'translation', path);
  }, 0);
  if (type === 'writing') array(value.exercises, '$.exercises', (entry, path) => {
    required(entry, 'instruction', path);
    for (const field of ['sentence', 'word', 'explanation', 'hint']) optional(entry, field, path);
    for (const field of ['words', 'acceptedAnswers']) if (entry[field] != null) check(list(entry[field], text, 0), `${path}.${field}`, 'array of nonempty strings', entry[field]);
    if (entry.corpusRank !== undefined) check(Number.isInteger(entry.corpusRank) && entry.corpusRank >= 1, `${path}.corpusRank`, 'positive integer', entry.corpusRank);
    const knownType = ['fill-in-blank', 'translation', 'word-order', 'multiple-choice'].includes(entry.type);
    check(knownType, `${path}.type`, 'fill-in-blank | translation | word-order | multiple-choice', entry.type);
    if (!knownType) return;
    if (entry.type === 'multiple-choice') { required(entry, 'word', path); choice(entry, path); }
    else {
      required(entry, 'answer', path);
      if (entry.type === 'word-order') {
        check(list(entry.words, text, 2), `${path}.words`, 'array with at least 2 nonempty strings', entry.words);
        if (list(entry.words, text, 2) && text(entry.answer)) check(sameWordTokens(entry.words, entry.answer), `${path}.answer`, 'same word tokens as words, including accents and duplicate counts', entry.answer);
        if (list(entry.words, text, 2) && Array.isArray(entry.acceptedAnswers)) entry.acceptedAnswers.forEach((answer, index) => check(sameWordTokens(entry.words, answer), `${path}.acceptedAnswers[${index}]`, 'same word tokens as words, including accents and duplicate counts', answer));
      }
      else required(entry, 'sentence', path);
    }
  });
  if (type === 'reading') {
    required(value, 'passage', '$'); required(value, 'passageTranslation', '$');
    array(value.vocabulary, '$.vocabulary', (entry, path) => { required(entry, 'word', path); required(entry, 'translation', path); optional(entry, 'exampleSentence', path); optional(entry, 'exampleTranslation', path); });
    array(value.questions, '$.questions', (entry, path) => { required(entry, 'question', path); choice(entry, path); optional(entry, 'explanation', path); });
  }
  if (type === 'speaking') {
    for (const [field, keys] of [['pronunciationCards', ['word', 'translation', 'phoneticHint']], ['phrases', ['phrase', 'translation', 'context']], ['dialogue', ['speaker', 'line', 'translation']]]) {
      array(value[field], `$.${field}`, (entry, path) => keys.forEach((key) => required(entry, key, path)));
    }
  }
  return issues;
}

export function buildLessonPrompt(words, type, language, level) {
  const languageName = language.charAt(0).toUpperCase() + language.slice(1);
  const system = `You are a careful ${languageName} teacher creating a short, useful lesson.
Teach natural communication in an everyday situation. Target the supplied vocabulary, while using common function words, inflections, and supporting vocabulary where needed for grammatical sentences. Do not force unrelated words into an unnatural story.
Use simple present-tense sentences at early course levels; gradually increase complexity. Course level ${level} of 16 is vocabulary progression, not a CEFR proficiency certification.
Give the learner a concrete communication objective. Teach grammar briefly in context. Ask learners to retrieve knowledge, and give specific corrective explanations. Do not make claims about fluency in days, retention percentages, or learning styles.
All instructions, objectives, explanations, and translations are in English. Target-language examples must be idiomatic ${languageName}. Return valid JSON only. Use only the fields requested; omit fields that do not apply to an exercise type. Use the exact type names fill-in-blank, translation, word-order, and multiple-choice for writing exercises. Check every correctIndex and answer before responding.`;
  const vocabulary = words.map((w) => `${w.rank}: ${w.word} (${w.translation})`).join(', ');
  const common = `Create a ${type} lesson. Target vocabulary with corpus ranks: ${vocabulary}.\n`;
  const header = '"title":"Short situation-based title","objective":"By the end, you can ..."';
  if (type === 'reading') return { system, user: `${common}Return {${header},"passage":"4-6 connected target-language sentences","passageTranslation":"Faithful English translation","vocabulary":[{"word":"target word","translation":"meaning in this context","exampleSentence":"short example","exampleTranslation":"English example"}],"questions":[{"question":"Question about an explicitly stated detail","options":["option","option","option","option"],"correctIndex":0,"explanation":"Explain the correct answer using evidence from the passage"}]}.
Include 8-10 vocabulary entries and 4 comprehension questions with exactly one valid answer each. Vary the correct answer positions.` };
  if (type === 'writing') return { system, user: `${common}Return one object with this exact structure. These four sample items show each variant; expand them to the requested 10 exercises:
{${header},"exercises":[
{"type":"fill-in-blank","instruction":"Fill in the blank","sentence":"Target-language sentence with _____","answer":"missing word","acceptedAnswers":[],"hint":"English meaning","corpusRank":${words[0].rank},"explanation":"Brief explanation of the word or grammar"},
{"type":"translation","instruction":"Translate into ${languageName}","sentence":"English sentence to translate","answer":"Complete target-language translation","acceptedAnswers":["Another equally valid target-language translation"],"corpusRank":${words[0].rank},"explanation":"Explain the sentence pattern"},
{"type":"word-order","instruction":"Put these words in order","words":["shuffled","target-language","tokens"],"answer":"Tokens in a grammatical sentence","acceptedAnswers":[],"corpusRank":${words[0].rank},"explanation":"Explain this word order"},
{"type":"multiple-choice","instruction":"Choose the English meaning","word":"target vocabulary word","options":["correct meaning","incorrect meaning 1","incorrect meaning 2","incorrect meaning 3"],"correctIndex":0,"corpusRank":${words[0].rank},"explanation":"Explain the correct meaning"}
]}.
For multiple-choice, correctIndex MUST be an unquoted integer 0, 1, 2, or 3, not a letter, answer string, or one-based index. Every word-order words field MUST be an array of strings, not a sentence. Copy each type name exactly as shown. Omit irrelevant fields; do not use null for corpusRank. All answers and examples must be actual ${languageName}, not placeholder descriptions.
Include 10 exercises: 3 fill-in-blank, 2 translation, 2 word-order, 3 multiple-choice. Every exercise has instruction, corpusRank (the supplied rank of the main word being assessed), and a specific explanation.
Translation: sentence is English; answer is an idiomatic target-language sentence; acceptedAnswers includes common equally valid translations (pronoun omission, common synonymous phrasing, formal/informal variants where the prompt allows them).
Word-order: FIRST write a short grammatical answer, THEN split that answer into its word tokens and shuffle those exact tokens into words. Do not add, remove, repeat, conjugate, or change accents on any token when writing the answer or acceptedAnswers. Every accepted answer must use exactly the same words and duplicate counts; use [] when no alternative order is needed.
Multiple-choice: word is the target word, options has 4 distinct English meanings, correctIndex is the zero-based answer index. Vary answer positions. No ambiguous distractors.
Never accept an answer with a different meaning just because its spelling is similar.` };
  return { system, user: `${common}Return {${header},"pronunciationCards":[{"word":"target word","translation":"English meaning","phoneticHint":"Approximate pronunciation, with stressed syllable indicated"}],"phrases":[{"phrase":"Useful target-language phrase","translation":"English meaning","context":"Specific situation where you would say this"}],"dialogue":[{"speaker":"A","line":"Target-language line","translation":"English meaning"}]}.
Include all ${words.length} supplied words as pronunciation cards, 5 short practical phrases, and a coherent 6-line exchange between A and B. This is listen-and-repeat practice with learner self-assessment, not automatic pronunciation scoring.` };
}
