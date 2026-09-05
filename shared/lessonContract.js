const text = (value) => typeof value === 'string' && value.trim().length > 0;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
// Generators sometimes emit null or empty strings for unused fields. These are
// safe to render; required fields below still need meaningful content.
const optionalText = (value) => value == null || typeof value === 'string';
const list = (value, check, min = 1) => Array.isArray(value) && value.length >= min && value.every(check);
const choices = (item) => list(item.options, text, 2) && Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex < item.options.length;

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
    if (e.type === 'word-order') return list(e.words, text, 2);
    return ['translation', 'fill-in-blank'].includes(e.type) && text(e.sentence);
  });
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
  if (type === 'writing') return { system, user: `${common}Return {${header},"exercises":[{"type":"fill-in-blank","instruction":"Fill in the blank","sentence":"Target-language sentence with _____","answer":"missing word","acceptedAnswers":[],"hint":"meaning, not the answer","corpusRank":${words[0].rank},"explanation":"Brief explanation of the word or grammar"}]}.
Include 10 exercises: 3 fill-in-blank, 2 translation, 2 word-order, 3 multiple-choice. Every exercise has instruction, corpusRank (the supplied rank of the main word being assessed), and a specific explanation.
Translation: sentence is English; answer is an idiomatic target-language sentence; acceptedAnswers includes common equally valid translations (pronoun omission, common synonymous phrasing, formal/informal variants where the prompt allows them).
Word-order: words is a shuffled token array; answer uses exactly those tokens in a grammatical order. Include acceptedAnswers for other valid orders.
Multiple-choice: word is the target word, options has 4 distinct English meanings, correctIndex is the zero-based answer index. Vary answer positions. No ambiguous distractors.
Never accept an answer with a different meaning just because its spelling is similar.` };
  return { system, user: `${common}Return {${header},"pronunciationCards":[{"word":"target word","translation":"English meaning","phoneticHint":"Approximate pronunciation, with stressed syllable indicated"}],"phrases":[{"phrase":"Useful target-language phrase","translation":"English meaning","context":"Specific situation where you would say this"}],"dialogue":[{"speaker":"A","line":"Target-language line","translation":"English meaning"}]}.
Include all ${words.length} supplied words as pronunciation cards, 5 short practical phrases, and a coherent 6-line exchange between A and B. This is listen-and-repeat practice with learner self-assessment, not automatic pronunciation scoring.` };
}
