import { test, expect, Page } from '@playwright/test';

const signup = async (page: Page) => {
  await page.goto('/signup');
  await page.getByLabel('Name').fill('Feature User');
  await page.getByLabel('Email').fill(`feat_${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/dashboard/);
};

const addTodo = async (page: Page, title: string) => {
  await page.getByLabel('Title').fill(title);
  await page.getByRole('button', { name: 'Add todo' }).click();
  await expect(page.getByRole('article').filter({ hasText: title })).toBeVisible();
};

test('bulk delete -> trash -> restore', async ({ page }) => {
  await signup(page);
  await page.getByRole('button', { name: 'New todo' }).click();
  await addTodo(page, 'Task A');
  await addTodo(page, 'Task B');

  await page.getByLabel('Select Task A').check();
  await page.getByLabel('Select Task B').check();
  const bar = page.getByRole('region', { name: 'Bulk actions' });
  await expect(bar.getByText('2 selected')).toBeVisible();
  await bar.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Nothing here yet')).toBeVisible();

  await page.getByRole('link', { name: 'Trash' }).click();
  await expect(page.getByText('Task A')).toBeVisible();
  await page.getByRole('button', { name: /Restore/ }).first().click();

  await page.getByRole('link', { name: 'Todos' }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
});

test('keyboard shortcut N opens the new-todo form', async ({ page }) => {
  await signup(page);
  await page.keyboard.press('n');
  await expect(page.getByLabel('Title')).toBeFocused();
  await page.keyboard.press('Escape');
});

test('profile: change display name', async ({ page }) => {
  await signup(page);
  await page.getByRole('link', { name: 'Profile' }).click();
  await page.getByLabel('Name').fill('Renamed User');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Profile updated')).toBeVisible();
});
