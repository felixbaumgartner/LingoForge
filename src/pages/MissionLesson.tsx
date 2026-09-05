import { useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Headphones,
  Mic,
  Square,
} from "lucide-react";
import { AudioPlayer } from "../components/AudioPlayer";
import { useLocalRecording } from "../hooks/useLocalRecording";
import { useAppStore } from "../store/appStore";
import { getMission } from "../data/missions";
import { getMissionDue } from "../lib/learningJournal";
import { selectRecallPhrases } from "../lib/missionPractice";
import { normalizeWritingAnswer } from "../lib/answerGrading";
import type {
  LearningAttempt,
  Mission,
  MissionChallenge,
  MissionQuestion,
} from "../types/mission";
import type { Language } from "../types/language";

const secondary =
  "rounded-xl border border-slate-600 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-40";
const field =
  "w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white";

function Choices({
  question,
  answer,
  onAnswer,
  checked,
}: {
  question: MissionQuestion;
  answer?: number;
  onAnswer: (value: number) => void;
  checked: boolean;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 font-medium text-white">{question.prompt}</legend>
      {question.options.map((option, i) => (
        <label
          key={option}
          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm ${checked && i === question.correctIndex ? "border-emerald-400 bg-emerald-950/40 text-emerald-200" : answer === i ? "border-cyan-400 bg-cyan-950/20 text-white" : "border-slate-700 text-slate-300"}`}
        >
          <input
            type="radio"
            name={question.id}
            checked={answer === i}
            disabled={checked}
            onChange={() => onAnswer(i)}
            className="accent-emerald-400"
          />
          {option}
        </label>
      ))}
      {checked && (
        <p role="status" className="text-sm leading-relaxed text-slate-300">
          <strong
            className={
              answer === question.correctIndex
                ? "text-emerald-300"
                : "text-amber-300"
            }
          >
            {answer === question.correctIndex
              ? "Correct. "
              : `Answer: ${question.options[question.correctIndex]}. `}
          </strong>
          {question.explanation}
        </p>
      )}
    </fieldset>
  );
}

function ResponseAttempt({
  language,
  label,
  onSubmit,
  locked = false,
}: {
  language: Language;
  label: string;
  onSubmit: (response: string) => void;
  locked?: boolean;
}) {
  const [text, setText] = useState("");
  const recorder = useLocalRecording();
  if (locked)
    return recorder.url ? (
      <audio
        controls
        src={recorder.url}
        aria-label="Your first recording"
        className="mb-5 w-full"
      />
    ) : null;
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-950 p-4">
        <p className="mb-3 text-sm text-slate-300">
          Speak or type in {language}. Recording is optional, stays in this
          page’s memory, and stops after 90 seconds. Nothing is uploaded or
          automatically scored.
        </p>
        <button
          type="button"
          className={secondary}
          disabled={recorder.requesting}
          onClick={() =>
            recorder.recording ? recorder.stop() : void recorder.start()
          }
        >
          {recorder.recording ? (
            <span className="flex items-center gap-2">
              <Square className="h-4 w-4" /> Stop recording
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              {recorder.requesting
                ? "Waiting for permission…"
                : recorder.url
                  ? "Record again"
                  : "Enable microphone and record"}
            </span>
          )}
        </button>
        {recorder.recording && (
          <p role="status" className="mt-3 text-sm text-rose-300">
            Recording… Stop when your response is complete.
          </p>
        )}
        {recorder.error && (
          <p role="alert" className="mt-3 text-sm text-amber-300">
            {recorder.error}
          </p>
        )}
        {recorder.url && (
          <audio
            controls
            src={recorder.url}
            aria-label="Your recording"
            className="mt-4 w-full"
          />
        )}
      </div>
      <label className="block text-sm text-slate-300">
        {label}
        <textarea
          className={`${field} mt-2 min-h-28`}
          value={text}
          maxLength={3000}
          onChange={(event) => setText(event.target.value)}
          placeholder="Write what you would say…"
          autoComplete="off"
        />
      </label>
      <button
        type="button"
        className="primary-button"
        disabled={
          recorder.recording ||
          recorder.requesting ||
          (!text.trim() && !recorder.url)
        }
        onClick={() =>
          onSubmit(text.trim() || "Audio response recorded locally")
        }
      >
        Submit response <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Communicate({
  challenge,
  language,
  onComplete,
}: {
  challenge: MissionChallenge;
  language: Language;
  onComplete: (correct: boolean) => void;
}) {
  const [first, setFirst] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<Record<number, boolean>>({});
  const [revising, setRevising] = useState(false);
  return (
    <section className="surface-card rounded-2xl p-5 sm:p-8">
      <p className="eyebrow">Use the language</p>
      <h2 className="mt-2 text-2xl font-semibold">
        {revising
          ? "Try it again with one improvement"
          : "Complete the real-life task"}
      </h2>
      <p className="mt-4 text-slate-300">{challenge.situation}</p>
      <p className="my-5 text-lg text-white">{challenge.prompt}</p>
      <ResponseAttempt
        key="first"
        language={language}
        label="Your first response"
        locked={!!first}
        onSubmit={setFirst}
      />
      {first && !revising && (
        <div className="space-y-6">
          <div className="rounded-xl bg-slate-950 p-4">
            <p className="eyebrow">Your first response</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-slate-200">
              {first}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-5">
            <p className="eyebrow">One possible response</p>
            <p className="mt-3 text-lg text-emerald-200">
              {challenge.modelAnswer}
            </p>
            <p className="mb-4 mt-2 text-sm text-slate-400">
              {challenge.translation}
            </p>
            <AudioPlayer language={language} text={challenge.modelAnswer} />
          </div>
          <fieldset>
            <legend className="mb-3 font-semibold">
              Assess your first response honestly
            </legend>
            <p className="mb-4 text-sm text-slate-400">
              A different sentence can still work. Judge whether you
              communicated the meaning. This is your assessment, not an
              automatic language or pronunciation score.
            </p>
            {challenge.checklist.map((item, i) => (
              <div
                key={item}
                role="group"
                aria-label={item}
                className="mb-3 rounded-xl border border-slate-700 p-4"
              >
                <p className="mb-3 text-sm text-slate-200">{item}</p>
                <div className="flex gap-3">
                  {[true, false].map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      aria-pressed={assessment[i] === value}
                      className={`${secondary} ${assessment[i] === value ? "border-emerald-400 bg-emerald-950/40" : ""}`}
                      onClick={() =>
                        setAssessment((previous) => ({
                          ...previous,
                          [i]: value,
                        }))
                      }
                    >
                      {value ? "Yes" : "Not yet"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
          <button
            type="button"
            className="primary-button"
            disabled={challenge.checklist.some(
              (_, i) => assessment[i] === undefined,
            )}
            onClick={() => setRevising(true)}
          >
            Revise my response <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
      {first && revising && (
        <>
          <div className="mb-5 rounded-xl bg-emerald-950/20 p-4 text-sm text-emerald-200">
            <p>{challenge.modelAnswer}</p>
            <p className="mt-2 text-slate-400">
              Use the example to improve one thing. Your second attempt is
              rehearsal and does not increase your first-attempt score.
            </p>
          </div>
          <ResponseAttempt
            key="revision"
            language={language}
            label="Your improved response"
            onSubmit={() =>
              onComplete(
                challenge.checklist.every((_, i) => assessment[i] === true),
              )
            }
          />
        </>
      )}
    </section>
  );
}

export function MissionLesson() {
  const { language, missionId } = useParams();
  const [params] = useSearchParams();
  const mission = getMission(language as Language, missionId ?? "");
  if (!mission)
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-3xl px-5 py-12"
      >
        <h1 className="text-2xl font-semibold">Mission not found</h1>
        <p className="mt-3 text-slate-400">
          Choose a mission from your learning path.
        </p>
        <Link
          to={`/missions/${["spanish", "french", "dutch"].includes(language ?? "") ? language : "spanish"}`}
          className="primary-button mt-6"
        >
          Explore missions
        </Link>
      </main>
    );
  return (
    <MissionRun
      key={`${mission.id}:${params.get("mode")}`}
      mission={mission}
      transfer={params.get("mode") === "transfer"}
    />
  );
}

function MissionRun({
  mission,
  transfer,
}: {
  mission: Mission;
  transfer: boolean;
}) {
  const recordAttempt = useAppStore((state) => state.recordLearningAttempt);
  const completeMission = useAppStore((state) => state.completeMission);
  const journal = useAppStore((state) => state.learningJournal);
  const [session] = useState(() => ({
    id: crypto.randomUUID(),
    started: Date.now(),
    due: getMissionDue(journal, mission.id),
    phrases: selectRecallPhrases(mission, journal),
    repeatedTransfer: Object.values(journal.completions).some(
      (item) => item.missionId === mission.id && item.phase === "transfer",
    ),
  }));
  const phase = transfer && session.due.due ? "transfer" : "practice";
  const [step, setStep] = useState<
    "prepare" | "listen" | "recall" | "communicate" | "done"
  >(transfer ? "listen" : "prepare");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [recognitionChecked, setRecognitionChecked] = useState(false);
  const [recognitionStarted, setRecognitionStarted] = useState(false);
  const [recognitionAssisted, setRecognitionAssisted] = useState(false);
  const [toolkitVisible, setToolkitVisible] = useState(true);
  const [listeningChecked, setListeningChecked] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [listeningAssisted, setListeningAssisted] = useState(false);
  const [audioRequested, setAudioRequested] = useState(false);
  const [recall, setRecall] = useState<Record<string, string>>({});
  const [recallHints, setRecallHints] = useState<Record<string, boolean>>({});
  const [recallChecked, setRecallChecked] = useState(false);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [events, setEvents] = useState<LearningAttempt[]>([]);
  const completed = useRef(false);
  const submitted = useRef(new Set<string>());
  const story = phase === "transfer" ? mission.transfer.story : mission.story;
  const questions =
    phase === "transfer" ? mission.transfer.questions : mission.questions;
  const challenge =
    phase === "transfer" ? mission.transfer.challenge : mission.challenge;
  const phrases = session.phrases;
  const [recognition] = useState(() =>
    mission.phrases.map((phrase) => {
      const options = mission.phrases.map((item) => item.translation);
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      return {
        id: `recognize-${phrase.id}`,
        phraseId: phrase.id,
        prompt: `What does “${phrase.text}” mean?`,
        options,
        correctIndex: options.indexOf(phrase.translation),
        explanation: phrase.explanation,
      };
    }),
  );
  const isCorrect = (phrase: (typeof phrases)[number], value: string) =>
    [phrase.text, ...(phrase.alternatives ?? [])].some(
      (answer) =>
        normalizeWritingAnswer(answer) === normalizeWritingAnswer(value),
    );

  function save(
    questionId: string,
    phraseId: string,
    ability: LearningAttempt["ability"],
    correct: boolean,
    assisted: boolean,
    evidence: LearningAttempt["evidence"] = "objective",
  ) {
    const id = `${session.id}:${questionId}`;
    if (submitted.current.has(id)) return;
    submitted.current.add(id);
    const phrase =
      mission.phrases.find((item) => item.id === phraseId) ??
      mission.phrases[0];
    const event: LearningAttempt = {
      id,
      sessionId: session.id,
      missionId: mission.id,
      language: mission.language,
      phraseId: `${mission.id}:${phrase.id}`,
      concept: phrase.concept,
      ability,
      evidence,
      correct,
      assisted,
      phase,
      createdAt: new Date().toISOString(),
    };
    recordAttempt(event);
    setEvents((previous) => [...previous, event]);
  }

  function finish(correct: boolean) {
    if (completed.current) return;
    completed.current = true;
    const completedAt = new Date();
    save(
      "communicate",
      mission.phrases[0].id,
      "use",
      correct,
      false,
      "self-assessed",
    );
    completeMission({
      id: `${session.id}:complete`,
      missionId: mission.id,
      language: mission.language,
      phase,
      completedAt: completedAt.toISOString(),
      durationSeconds: Math.min(
        86400,
        Math.max(
          1,
          Math.round((completedAt.getTime() - session.started) / 1000),
        ),
      ),
    });
    setStep("done");
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function advance(next: typeof step) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const nextReview = getMissionDue(journal, mission.id);
  const steps = transfer
    ? ["listen", "recall", "communicate"]
    : ["prepare", "listen", "recall", "communicate"];
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-3xl px-4 py-7 sm:px-6 sm:py-10"
    >
      <Link
        to={`/missions/${mission.language}`}
        className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> All missions
      </Link>
      <p className="eyebrow">
        {mission.language} ·{" "}
        {transfer
          ? phase === "transfer"
            ? session.repeatedTransfer
              ? "Repeat retention check"
              : "Delayed transfer check"
            : "Early rehearsal"
          : "Real-life mission"}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {mission.title}
      </h1>
      <p className="mt-3 leading-relaxed text-slate-400">{mission.objective}</p>
      {transfer && phase === "practice" && (
        <p className="mt-4 rounded-xl border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-200">
          This is an early rehearsal. It will not count as a delayed retention
          check or postpone your scheduled review. The different situation is
          saved for your delayed check.
        </p>
      )}
      {transfer && phase === "transfer" && session.repeatedTransfer && (
        <p className="mt-4 rounded-xl bg-slate-900 p-4 text-sm text-slate-300">
          You are revisiting the same situation from your earlier retention
          check. This measures recall after a delay, not transfer to an unseen
          situation.
        </p>
      )}
      {step !== "done" && (
        <ol aria-label="Mission progress" className="my-7 flex gap-2">
          {steps.map((name, index) => (
            <li
              key={name}
              aria-current={step === name ? "step" : undefined}
              className={`flex-1 border-t-2 pt-3 text-xs capitalize sm:text-sm ${step === name ? "border-emerald-400 text-emerald-200" : "border-slate-700 text-slate-500"}`}
            >
              <span className="mr-1">{index + 1}.</span>
              {name}
            </li>
          ))}
        </ol>
      )}
      {step === "prepare" && (
        <div className="space-y-6">
          {toolkitVisible && (
            <section className="surface-card rounded-2xl p-5 sm:p-8">
              <p className="eyebrow">A small, useful toolkit</p>
              <h2 className="mb-5 mt-2 text-2xl font-semibold">
                Four phrases for this situation
              </h2>
              <div className="space-y-4">
                {mission.phrases.map((phrase) => (
                  <div key={phrase.id} className="rounded-xl bg-slate-950 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-medium text-white">
                          {phrase.text}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {phrase.translation}
                        </p>
                      </div>
                      <AudioPlayer
                        text={phrase.text}
                        language={mission.language}
                        size="sm"
                      />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">
                      {phrase.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
          {!recognitionStarted && (
            <button
              className="primary-button"
              onClick={() => {
                setRecognitionStarted(true);
                setToolkitVisible(false);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
            >
              Try meanings from memory
            </button>
          )}
          {recognitionStarted && (
            <section className="surface-card space-y-6 rounded-2xl p-5 sm:p-8">
              <h2 className="text-xl font-semibold">Check the meaning</h2>
              <p className="text-sm text-slate-400">
                Choose each meaning without looking back. Reviewing the phrases
                marks this check as assisted.
              </p>
              {!recognitionChecked && (
                <button
                  className={secondary}
                  onClick={() => {
                    setToolkitVisible(true);
                    setRecognitionAssisted(true);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                >
                  Review phrases
                </button>
              )}
              {recognition.map((question) => (
                <Choices
                  key={question.id}
                  question={question}
                  checked={recognitionChecked}
                  answer={answers[question.id]}
                  onAnswer={(value) =>
                    setAnswers((previous) => ({
                      ...previous,
                      [question.id]: value,
                    }))
                  }
                />
              ))}
              {!recognitionChecked ? (
                <button
                  className="primary-button"
                  disabled={recognition.some(
                    (question) => answers[question.id] === undefined,
                  )}
                  onClick={() => {
                    if (recognitionChecked) return;
                    recognition.forEach((question) =>
                      save(
                        question.id,
                        question.phraseId,
                        "recognition",
                        answers[question.id] === question.correctIndex,
                        recognitionAssisted,
                      ),
                    );
                    setRecognitionChecked(true);
                  }}
                >
                  Check meanings
                </button>
              ) : (
                <button
                  className="primary-button"
                  onClick={() => advance("listen")}
                >
                  Continue to listening <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </section>
          )}
        </div>
      )}
      {step === "listen" && (
        <section className="surface-card rounded-2xl p-5 sm:p-8">
          <Headphones className="h-7 w-7 text-cyan-300" />
          <h2 className="mt-3 text-2xl font-semibold">
            Listen for the meaning
          </h2>
          <p className="mb-5 mt-3 text-sm text-slate-400">
            Listen as often as you need, then answer the questions.{" "}
            {transfer
              ? "The transcript unlocks after you check your answers."
              : "Try without the transcript first. Revealing it marks these answers as assisted."}{" "}
            Browser voices provide the audio.
          </p>
          <AudioPlayer
            language={mission.language}
            text={story.text}
            onPlaybackStart={() => setAudioRequested(true)}
          />
          <button
            type="button"
            disabled={transfer && !listeningChecked}
            className={`${secondary} my-5`}
            onClick={() => {
              setTranscript((value) => !value);
              if (!listeningChecked) setListeningAssisted(true);
            }}
          >
            {transcript ? "Hide transcript" : "Reveal transcript"}
          </button>
          <button
            type="button"
            className="mb-5 block text-sm text-slate-400 underline underline-offset-4"
            onClick={() => {
              setTranscript(true);
              if (!listeningChecked) setListeningAssisted(true);
            }}
          >
            Audio unavailable? Read instead (assisted)
          </button>
          {transcript && (
            <div className="mb-6 rounded-xl bg-slate-950 p-5">
              <p className="whitespace-pre-line leading-relaxed text-white">
                {story.text}
              </p>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-400">
                {story.translation}
              </p>
            </div>
          )}
          <div className="space-y-7">
            {questions.map((question) => (
              <Choices
                key={question.id}
                question={question}
                checked={listeningChecked}
                answer={answers[`listen-${question.id}`]}
                onAnswer={(value) =>
                  setAnswers((previous) => ({
                    ...previous,
                    [`listen-${question.id}`]: value,
                  }))
                }
              />
            ))}
          </div>
          {!listeningChecked ? (
            <button
              className="primary-button mt-7"
              disabled={
                (!audioRequested && !listeningAssisted) ||
                questions.some(
                  (question) => answers[`listen-${question.id}`] === undefined,
                )
              }
              onClick={() => {
                if (listeningChecked) return;
                questions.forEach((question) =>
                  save(
                    `listen-${question.id}`,
                    question.phraseId,
                    "listening",
                    answers[`listen-${question.id}`] === question.correctIndex,
                    listeningAssisted,
                  ),
                );
                setListeningChecked(true);
              }}
            >
              Check listening answers
            </button>
          ) : (
            <button
              className="primary-button mt-7"
              onClick={() => advance("recall")}
            >
              Continue to recall <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </section>
      )}
      {step === "recall" && (
        <section className="surface-card space-y-6 rounded-2xl p-5 sm:p-8">
          <div>
            <p className="eyebrow">Retrieve, then repair</p>
            <h2 className="mt-2 text-2xl font-semibold">Say it from memory</h2>
            <p className="mt-3 text-sm text-slate-400">
              Recall the useful phrases. Common alternatives are accepted;
              accents matter. A different valid phrasing may still need
              comparison with the model.
            </p>
          </div>
          {phrases.map((phrase) => {
            const correct = isCorrect(phrase, recall[phrase.id] ?? "");
            return (
              <div
                key={phrase.id}
                className="rounded-xl border border-slate-700 p-4"
              >
                <label
                  htmlFor={`recall-${phrase.id}`}
                  className="mb-3 block font-medium"
                >
                  {phrase.translation}
                </label>
                <input
                  id={`recall-${phrase.id}`}
                  className={field}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={recallChecked}
                  value={recall[phrase.id] ?? ""}
                  onChange={(event) =>
                    setRecall((previous) => ({
                      ...previous,
                      [phrase.id]: event.target.value,
                    }))
                  }
                />
                {!recallChecked && (
                  <>
                    <div
                      className="mt-3 flex flex-wrap gap-2"
                      aria-label="Accented letters"
                    >
                      {(mission.language === "spanish"
                        ? "áéíóúñü"
                        : mission.language === "french"
                          ? "àâçéèêëîïôùûüœ"
                          : "éëï"
                      )
                        .split("")
                        .map((letter) => (
                          <button
                            key={letter}
                            type="button"
                            className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300"
                            aria-label={`Insert ${letter}`}
                            onClick={() => {
                              const input = document.getElementById(
                                `recall-${phrase.id}`,
                              ) as HTMLInputElement;
                              const value = recall[phrase.id] ?? "";
                              const cursor =
                                input.selectionStart ?? value.length;
                              const end = input.selectionEnd ?? cursor;
                              setRecall((previous) => ({
                                ...previous,
                                [phrase.id]:
                                  value.slice(0, cursor) +
                                  letter +
                                  value.slice(end),
                              }));
                              requestAnimationFrame(() => {
                                input.focus();
                                input.setSelectionRange(cursor + 1, cursor + 1);
                              });
                            }}
                          >
                            {letter}
                          </button>
                        ))}
                    </div>
                    {!transfer && (
                      <button
                        type="button"
                        className="mt-4 text-sm text-slate-400 underline underline-offset-4"
                        onClick={() =>
                          setRecallHints((previous) => ({
                            ...previous,
                            [phrase.id]: true,
                          }))
                        }
                      >
                        Show phrase (counts as assisted)
                      </button>
                    )}
                    {recallHints[phrase.id] && (
                      <p className="mt-3 text-amber-200">{phrase.text}</p>
                    )}
                  </>
                )}
                {recallChecked && (
                  <div role="status" className="mt-4 space-y-3 text-sm">
                    <p
                      className={
                        correct ? "text-emerald-300" : "text-amber-300"
                      }
                    >
                      {correct ? "Correct." : `Model phrase: ${phrase.text}`}
                    </p>
                    <p className="text-slate-400">{phrase.explanation}</p>
                    {!correct && (
                      <label className="block text-slate-300">
                        Practise the corrected phrase
                        <input
                          className={`${field} mt-2`}
                          autoComplete="off"
                          value={corrections[phrase.id] ?? ""}
                          onChange={(event) =>
                            setCorrections((previous) => ({
                              ...previous,
                              [phrase.id]: event.target.value,
                            }))
                          }
                        />
                        <span className="mt-2 block text-xs text-slate-400">
                          Correction practice does not replace your first
                          attempt.
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {!recallChecked ? (
            <button
              className="primary-button"
              disabled={phrases.some((phrase) => !recall[phrase.id]?.trim())}
              onClick={() => {
                if (recallChecked) return;
                phrases.forEach((phrase) =>
                  save(
                    `recall-${phrase.id}`,
                    phrase.id,
                    "recall",
                    isCorrect(phrase, recall[phrase.id] ?? ""),
                    !!recallHints[phrase.id],
                  ),
                );
                setRecallChecked(true);
              }}
            >
              Check recalled phrases
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={phrases.some(
                (phrase) =>
                  !isCorrect(phrase, recall[phrase.id] ?? "") &&
                  !isCorrect(phrase, corrections[phrase.id] ?? ""),
              )}
              onClick={() => advance("communicate")}
            >
              Continue to real-life task <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </section>
      )}
      {step === "communicate" && (
        <Communicate
          challenge={challenge}
          language={mission.language}
          onComplete={finish}
        />
      )}
      {step === "done" && (
        <section
          aria-live="polite"
          className="study-hero mt-7 rounded-2xl p-6 sm:p-9"
        >
          <CheckCircle2 className="mb-4 h-10 w-10 text-emerald-300" />
          <p className="eyebrow">A complete learning cycle</p>
          <h2 className="mt-2 text-3xl font-semibold">Mission complete</h2>
          <p className="mt-3 text-slate-300">
            You understood a situation, recalled useful language, and improved
            your own response.
          </p>
          <div className="my-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                label: "Unaided correct",
                value: `${events.filter((event) => event.evidence === "objective" && !event.assisted && event.correct).length}/${events.filter((event) => event.evidence === "objective" && !event.assisted).length}`,
              },
              {
                label: "Assisted answers",
                value: events.filter(
                  (event) => event.evidence === "objective" && event.assisted,
                ).length,
              },
              { label: "Communication", value: "Self-assessed" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-slate-950/60 p-4">
                <p className="text-lg font-semibold text-emerald-200">
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            Your first attempts are saved separately from corrections. The first
            delayed check uses a different situation; later checks revisit it to
            measure retention.
          </p>
          {nextReview.dueAt && (
            <p className="mt-4 text-sm text-emerald-200">
              Next retention check:{" "}
              {new Date(nextReview.dueAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {nextReview.due ? " · Ready now" : ""}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={`/missions/${mission.language}`}
              className="primary-button"
            >
              See my mission progress
            </Link>
            {events.some(
              (event) => event.evidence === "objective" && !event.correct,
            ) && (
              <Link
                className={secondary}
                to={`/missions/${mission.language}/clinic`}
              >
                Practise my mistakes
              </Link>
            )}
            {!transfer && (
              <Link
                to={`/missions/${mission.language}/${mission.id}?mode=transfer`}
                className={secondary}
              >
                Rehearse this mission
              </Link>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
