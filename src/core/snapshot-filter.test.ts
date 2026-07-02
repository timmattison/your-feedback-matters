import { includeInSnapshot } from './snapshot-filter';

test('excludes the form action buttons from the crumpled-paper snapshot', () => {
  expect(includeInSnapshot(document.createElement('button'))).toBe(false);
});

test('keeps the form, its inputs, and its text in the snapshot', () => {
  expect(includeInSnapshot(document.createElement('form'))).toBe(true);
  expect(includeInSnapshot(document.createElement('input'))).toBe(true);
  expect(includeInSnapshot(document.createElement('textarea'))).toBe(true);
  expect(includeInSnapshot(document.createElement('div'))).toBe(true);
});
