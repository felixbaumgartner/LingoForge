import { test, expect, type Page } from "@playwright/test";
import { getMission } from "../src/data/missions";

const mission = getMission("spanish", "spanish-cafe")!;
test.beforeEach(async ({ page }) => {
  // Exercise actual start callbacks deterministically; this is not an audio-quality test.
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () =>
          ["es-ES", "fr-FR", "nl-NL"].map((lang) => ({
            lang,
            name: `Test ${lang}`,
            default: false,
            localService: true,
            voiceURI: lang,
          })),
        cancel: () => {},
        speak: (utterance: SpeechSynthesisUtterance) => {
          utterance.onstart?.call(utterance, {} as SpeechSynthesisEvent);
          setTimeout(
            () => utterance.onend?.call(utterance, {} as SpeechSynthesisEvent),
            10,
          );
        },
      },
    });
  });
});
async function open(page: Page, transfer = false, scenario = "dashboard") {
  const path = `/missions/spanish/spanish-cafe${transfer ? "?mode=transfer" : ""}`;
  await page.goto(
    `/e2e/harness.html?${new URLSearchParams({ path, scenario })}`,
  );
  await expect(
    page.getByRole("heading", { name: mission.title, exact: true }),
  ).toBeVisible();
}
async function snapshot(page: Page) {
  return page.evaluate(
    () => window.__lingoforgeTest.snapshot().learningJournal,
  );
}
async function listen(page: Page, transfer = false, assisted = false) {
  if (assisted)
    await page
      .getByRole("button", {
        name: "Audio unavailable? Read instead (assisted)",
      })
      .click();
  else
    await page
      .getByRole("button", { name: "Play pronunciation", exact: true })
      .click();
  for (const question of transfer
    ? mission.transfer.questions
    : mission.questions) {
    await page
      .getByRole("group", { name: question.prompt })
      .getByRole("radio", {
        name: question.options[question.correctIndex],
        exact: true,
      })
      .check();
  }
  await page.getByRole("button", { name: "Check listening answers" }).click();
  await page.getByRole("button", { name: "Continue to recall" }).click();
}
async function recall(page: Page, wrong = false) {
  await page
    .getByRole("textbox", { name: mission.phrases[0].translation, exact: true })
    .fill(wrong ? "incorrecta" : mission.phrases[0].text);
  await page
    .getByRole("textbox", { name: mission.phrases[1].translation, exact: true })
    .fill(mission.phrases[1].text);
  await page
    .getByRole("button", { name: "Check recalled phrases" })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  if (wrong) {
    await expect(
      page.getByRole("button", { name: "Continue to real-life task" }),
    ).toBeDisabled();
    await page
      .getByRole("textbox", { name: /Practise the corrected phrase/ })
      .fill(mission.phrases[0].text);
  }
  await page
    .getByRole("button", { name: "Continue to real-life task" })
    .click();
}
async function communicate(page: Page, deniedMic = false) {
  await expect(
    page.getByText("One possible response", { exact: true }),
  ).not.toBeVisible();
  if (deniedMic) {
    await page
      .getByRole("button", { name: "Enable microphone and record" })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Microphone access was unavailable",
    );
  }
  await page
    .getByRole("textbox", { name: "Your first response" })
    .fill("Quisiera un café, por favor.");
  await page
    .getByRole("button", { name: "Submit response", exact: true })
    .click();
  await expect(
    page.getByText("One possible response", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Revise my response" }),
  ).toBeDisabled();
  for (const button of await page
    .getByRole("button", { name: "Not yet", exact: true })
    .all())
    await button.click();
  await page.getByRole("button", { name: "Revise my response" }).click();
  await page
    .getByRole("textbox", { name: "Your improved response" })
    .fill(mission.challenge.modelAnswer);
  await page
    .getByRole("button", { name: "Submit response", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(
    page.getByRole("heading", { name: "Mission complete", exact: true }),
  ).toBeVisible();
}

test("complete mission keeps recognition separate, repairs mistakes, and supports denied microphone", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () =>
        Promise.reject(new DOMException("Denied", "NotAllowedError")),
    });
  });
  await open(page);
  await page.getByRole("button", { name: "Try meanings from memory" }).click();
  await expect(
    page.getByRole("heading", { name: "Four phrases for this situation" }),
  ).not.toBeVisible();
  for (const phrase of mission.phrases) {
    await page
      .getByRole("group", { name: `What does “${phrase.text}” mean?` })
      .getByRole("radio", { name: phrase.translation, exact: true })
      .check();
  }
  await page
    .getByRole("button", { name: "Check meanings", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue to listening" }).click();
  await listen(page, false, true);
  await recall(page, true);
  expect(Object.values((await snapshot(page)).completions)).toHaveLength(0);
  await communicate(page, true);
  const journal = await snapshot(page);
  const attempts = Object.values(journal.attempts);
  expect(attempts).toHaveLength(9);
  expect(
    attempts.filter(
      (item) =>
        item.ability === "recognition" && !item.assisted && item.correct,
    ),
  ).toHaveLength(4);
  expect(
    attempts.filter((item) => item.ability === "listening" && item.assisted),
  ).toHaveLength(2);
  expect(
    attempts.filter((item) => item.ability === "recall" && !item.correct),
  ).toHaveLength(1);
  expect(attempts.find((item) => item.ability === "use")).toMatchObject({
    evidence: "self-assessed",
    correct: false,
  });
  expect(Object.values(journal.completions)).toHaveLength(1);
  await expect(page.getByText(/Next retention check:/)).toBeVisible();
});

for (const scenario of ["mission-early", "mission-due"])
  test(`${scenario} uses changed content and records the right retention phase`, async ({
    page,
  }) => {
    await open(page, true, scenario);
    await expect(
      page.getByRole("heading", { name: "Four phrases for this situation" }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Reveal transcript", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Check listening answers" }),
    ).toBeDisabled();
    await listen(page, scenario === "mission-due");
    await recall(page);
    await communicate(page);
    const journal = await snapshot(page);
    const phase = scenario === "mission-due" ? "transfer" : "practice";
    expect(Object.values(journal.attempts)).toHaveLength(5);
    expect(
      Object.values(journal.attempts).every((item) => item.phase === phase),
    ).toBe(true);
    expect(
      Object.values(journal.completions).find((item) => item.id !== "seed")
        ?.phase,
    ).toBe(phase);
  });

test("leaving during recording stops every microphone track", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const tracking = { stops: 0 };
    Object.assign(window, { __recordingTest: tracking });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => ({
        getTracks: () => [
          {
            stop: () => {
              tracking.stops++;
            },
          },
        ],
      }),
    });
    class Recorder {
      state = "inactive";
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({
          data: new Blob(["fixture"], { type: "audio/webm" }),
        });
        this.onstop?.();
      }
    }
    Object.defineProperty(window, "MediaRecorder", {
      configurable: true,
      value: Recorder,
    });
  });
  await open(page, true, "mission-early");
  await listen(page);
  await recall(page);
  await page
    .getByRole("button", { name: "Enable microphone and record" })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop recording", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All missions", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __recordingTest: { stops: number } })
          .__recordingTest.stops,
    ),
  ).toBeGreaterThan(0);
  expect(Object.values((await snapshot(page)).completions)).toHaveLength(1); // Only the pre-existing fixture completion.
});

test("a play click without successful audio cannot count as unaided listening", async ({
  page,
}) => {
  await page.addInitScript(() => {
    speechSynthesis.speak = () => {};
  });
  await open(page, true, "mission-early");
  await page
    .getByRole("button", { name: "Play pronunciation", exact: true })
    .click();
  for (const question of mission.questions)
    await page
      .getByRole("group", { name: question.prompt })
      .getByRole("radio", {
        name: question.options[question.correctIndex],
        exact: true,
      })
      .check();
  await expect(
    page.getByRole("button", { name: "Check listening answers" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Audio unavailable? Read instead (assisted)" })
    .click();
  await page.getByRole("button", { name: "Check listening answers" }).click();
  expect(
    Object.values((await snapshot(page)).attempts).every(
      (attempt) => attempt.assisted && attempt.ability === "listening",
    ),
  ).toBe(true);
});
