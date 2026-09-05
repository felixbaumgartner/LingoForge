/** Preserve the correct answer while removing the model's answer-position bias. */
export function shuffleLessonChoices(lesson, random = Math.random) {
  const shuffle = (question) => {
    if (!Array.isArray(question.options) || !Number.isInteger(question.correctIndex)) return question;
    const choices = question.options.map((text, index) => ({ text, correct: index === question.correctIndex }));
    for (let index = choices.length - 1; index > 0; index--) {
      const other = Math.floor(random() * (index + 1));
      [choices[index], choices[other]] = [choices[other], choices[index]];
    }
    return { ...question, options: choices.map((choice) => choice.text), correctIndex: choices.findIndex((choice) => choice.correct) };
  };
  return {
    ...lesson,
    ...(Array.isArray(lesson.questions) ? { questions: lesson.questions.map(shuffle) } : {}),
    ...(Array.isArray(lesson.exercises) ? { exercises: lesson.exercises.map(shuffle) } : {}),
  };
}
