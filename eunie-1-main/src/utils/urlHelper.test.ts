import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getFullStorageUrl, getRelativePath } from './urlHelper.ts';

describe('urlHelper', () => {
  const DEFAULT_BUCKET = 'yuni-8f439.firebasestorage.app';
  const ASSETS_PREFIX = 'eunie-assets';

  describe('getFullStorageUrl', () => {
    test('should return empty string for empty input', () => {
      assert.strictEqual(getFullStorageUrl(''), '');
      assert.strictEqual(getFullStorageUrl(null as any), '');
      assert.strictEqual(getFullStorageUrl(undefined as any), '');
    });

    test('should return already full URL', () => {
      const fullUrl = 'https://example.com/image.png';
      assert.strictEqual(getFullStorageUrl(fullUrl), fullUrl);
    });

    test('should format relative path correctly', () => {
      const relativePath = 'cards/tw/image/img_01.jpeg';
      const expected = `https://firebasestorage.googleapis.com/v0/b/${DEFAULT_BUCKET}/o/${encodeURIComponent(ASSETS_PREFIX + '/' + relativePath)}?alt=media`;
      assert.strictEqual(getFullStorageUrl(relativePath), expected);
    });

    test('should handle leading slash in relative path', () => {
      const relativePath = '/cards/tw/image/img_01.jpeg';
      const expected = `https://firebasestorage.googleapis.com/v0/b/${DEFAULT_BUCKET}/o/${encodeURIComponent(ASSETS_PREFIX + '/cards/tw/image/img_01.jpeg')}?alt=media`;
      assert.strictEqual(getFullStorageUrl(relativePath), expected);
    });

    test('should encode path correctly', () => {
      const relativePath = 'folder with spaces/image.png';
      const expected = `https://firebasestorage.googleapis.com/v0/b/${DEFAULT_BUCKET}/o/${encodeURIComponent(ASSETS_PREFIX + '/' + relativePath)}?alt=media`;
      assert.strictEqual(getFullStorageUrl(relativePath), expected);
    });
  });

  describe('getRelativePath', () => {
    test('should return empty string for empty input', () => {
      assert.strictEqual(getRelativePath(''), '');
      assert.strictEqual(getRelativePath(null as any), '');
      assert.strictEqual(getRelativePath(undefined as any), '');
    });

    test('should return non-URL string as-is', () => {
      const input = 'some/relative/path';
      assert.strictEqual(getRelativePath(input), input);
    });

    test('should extract relative path from full Firebase Storage URL', () => {
      const relativePath = 'cards/tw/image/img_01.jpeg';
      const fullUrl = `https://firebasestorage.googleapis.com/v0/b/${DEFAULT_BUCKET}/o/${encodeURIComponent(ASSETS_PREFIX + '/' + relativePath)}?alt=media`;
      assert.strictEqual(getRelativePath(fullUrl), relativePath);
    });

    test('should extract path correctly when prefix is missing', () => {
      const path = 'other/path/image.png';
      const fullUrl = `https://firebasestorage.googleapis.com/v0/b/${DEFAULT_BUCKET}/o/${encodeURIComponent(path)}?alt=media`;
      assert.strictEqual(getRelativePath(fullUrl), path);
    });

    test('should return original URL for non-Firebase Storage URL', () => {
      const otherUrl = 'https://other-storage.com/image.png';
      assert.strictEqual(getRelativePath(otherUrl), otherUrl);
    });

    test('should handle invalid URL by returning original string', () => {
      const invalidUrl = 'http://:invalid-url';
      assert.strictEqual(getRelativePath(invalidUrl), invalidUrl);
    });
  });
});
