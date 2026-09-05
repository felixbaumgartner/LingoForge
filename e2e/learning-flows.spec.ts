import { test, expect, type Page } from '@playwright/test';
import { words } from './fixtures';

async function open(page: Page, path = '/', scenario = 'dashboard') {
  await page.goto(`/e2e/harness.html?${new URLSearchParams({ path, scenario })}`);
  await expect(page.getByRole('button', { name: 'LingoForge home' })).toBeVisible();
}

async function snapshot(page: Page) {
  return page.evaluate(() => window.__lingoforgeTest.snapshot());
}

test.beforeEach(async ({ page }) => {
  // Fixture learning never needs provider calls or an authenticated cloud session.
  await page.route('**/api/lessons/generate', (route) => route.abort());
  await page.route('**/api/tts/**', (route) => route.abort());
});

test('a new learner can start every skill and search/filter their collection', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('heading', { name: 'A little closer, every day.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start my first practice' })).toBeEnabled();
  for (const skill of ['reading', 'writing', 'speaking']) {
    await page.getByRole('button', { name: `Start ${skill}`, exact: true }).click();
    await expect(page.getByRole('heading', { name: new RegExp(`${skill} fixture 1`, 'i') })).toBeVisible();
    await page.getByRole('button', { name: 'LingoForge home' }).click();
  }
  await open(page, '/vocabulary/spanish', 'vocabulary');
  await expect(page.getByRole('article')).toHaveCount(10);
  await page.getByRole('searchbox', { name: 'Search words or English meanings' }).fill('cafe');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'café', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByRole('button', { name: 'Due now', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'casa', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Strong recall', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'café', exact: true })).toBeVisible();
});

test('mixed recall retries a mistake once and records only first attempts', async ({ page }) => {
  await open(page, '/practice/spanish');
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  for (let index = 0; index < 11; index++) {
    const session = page.getByRole('region', { name: 'Daily practice session' });
    const prompt = await session.getByRole('heading', { level: 2 }).innerText();
    const word = words.find((candidate) => candidate.word === prompt || candidate.translation === prompt)!;
    if (index === 10) await expect(page.getByText('Second chance', { exact: true })).toBeVisible();
    const input = page.getByRole('textbox', { name: 'Your answer in Spanish' });
    if (await input.count()) {
      await input.fill(word.word);
    } else if (index === 0) {
      const radios = page.getByRole('radio');
      await radios.nth(await radios.first().inputValue() === word.translation ? 1 : 0).check();
    } else {
      await page.getByRole('radio', { name: word.translation, exact: true }).check();
    }
    // Two click events in one turn reproduce accidental duplicate submissions.
    await page.getByRole('button', { name: 'Check answer', exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    await expect(page.getByRole('button', { name: index === 10 ? 'See my results' : 'Continue', exact: true })).toBeVisible();
    await page.getByRole('button', { name: index === 10 ? 'See my results' : 'Continue', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Practice complete.' })).toBeVisible();
  await expect(page.getByText('90%', { exact: true })).toBeVisible();
  await expect(page.getByText('Recalled on retry', { exact: true })).toBeVisible();
  const { wordPerformance } = await snapshot(page);
  expect(Object.values(wordPerformance).reduce((sum, word) => sum + word.reviewCount, 0)).toBe(10);
  expect(wordPerformance['spanish-1']).toMatchObject({ timesIncorrect: 1, timesCorrect: 0, reviewCount: 1 });
});

test('writing retries keep correct answers and do not inflate word history', async ({ page }) => {
  await open(page, '/lesson/spanish/writing/1/1');
  await page.getByRole('textbox', { name: /Translate house/ }).fill('wrong');
  await page.getByRole('textbox', { name: /Translate water/ }).fill('agua');
  await page.getByRole('button', { name: 'Check answers', exact: true }).click();
  await expect(page.getByRole('heading', { name: '1/2 correct' })).toBeVisible();
  expect((await snapshot(page)).progress.spanish.writing['1-1']).toBeUndefined();
  await page.getByRole('button', { name: 'Practise missed answers' }).click();
  await expect(page.getByRole('textbox', { name: /Translate water/ })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: /Translate water/ })).toHaveValue('agua');
  await page.getByRole('textbox', { name: /Translate house/ }).fill('casa');
  await page.getByRole('button', { name: 'Check answers', exact: true }).click();
  await expect(page.getByRole('heading', { name: '2/2 correct' })).toBeVisible();
  const { progress, wordPerformance } = await snapshot(page);
  expect(progress.spanish.writing['1-1']).toMatchObject({ completed: true, score: 100 });
  expect(wordPerformance['spanish-1']).toMatchObject({ reviewCount: 1, timesIncorrect: 1, timesCorrect: 0 });
  expect(wordPerformance['spanish-2']).toMatchObject({ reviewCount: 1, timesCorrect: 1 });
  await page.getByRole('button', { name: 'Next lesson', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Writing fixture 2' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /Translate house/ })).toHaveValue('');
});

test('reading waits for vocabulary and flashcard ratings never shrink the active deck', async ({ page }) => {
  await open(page, '/lesson/spanish/reading/1/1');
  await page.getByRole('button', { name: 'Water', exact: true }).click();
  await page.getByRole('button', { name: 'Check Answers', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Vocabulary Quiz', exact: true })).toBeVisible();
  expect((await snapshot(page)).progress.spanish.reading['1-1']).toBeUndefined();
  const quiz = page.getByRole('heading', { name: 'Vocabulary Quiz', exact: true }).locator('..');
  for (let index = 0; index < words.length; index++) {
    await quiz.locator('.space-y-5 > div').nth(index).getByRole('button', { name: words[index].translation, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Submit Vocabulary Quiz' }).click();
  await expect(page.getByText('10/10 vocabulary', { exact: true })).toBeVisible();
  expect((await snapshot(page)).progress.spanish.reading['1-1']).toMatchObject({ completed: true });

  await open(page, '/review/spanish', 'review');
  await page.getByRole('button', { name: 'Start review' }).click();
  const seen: string[] = [];
  for (let index = 0; index < 10; index++) {
    await expect(page.getByText(`Card ${index + 1} of 10`, { exact: true })).toBeVisible();
    seen.push(await page.getByRole('region', { name: 'Flashcard session' }).getByRole('heading', { level: 2 }).innerText());
    await page.getByRole('button', { name: 'Reveal answer' }).click();
    await page.keyboard.press('3');
    await page.getByRole('button', { name: index === 9 ? 'Finish session' : 'Next card', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Session complete!' })).toBeVisible();
  expect(new Set(seen).size).toBe(10);
  const { wordPerformance } = await snapshot(page);
  expect(Object.values(wordPerformance)).toHaveLength(10);
  expect(Object.values(wordPerformance).every((word) => word.reviewCount === 1)).toBe(true);
});

