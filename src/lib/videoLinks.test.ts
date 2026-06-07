import { describe, expect, it } from 'vitest';
import { embedUrl, parseVideoLink, thumbnailUrl } from './videoLinks';

describe('parseVideoLink — YouTube', () => {
  it('parses watch URLs (with extra params)', () => {
    expect(parseVideoLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toMatchObject({
      provider: 'youtube',
      externalId: 'dQw4w9WgXcQ',
    });
  });
  it('parses youtu.be, embed, shorts, live, and nocookie', () => {
    for (const url of [
      'https://youtu.be/dQw4w9WgXcQ?si=x',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/live/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(parseVideoLink(url)).toMatchObject({ provider: 'youtube', externalId: 'dQw4w9WgXcQ' });
    }
  });
  it('accepts a bare id', () => {
    expect(parseVideoLink('dQw4w9WgXcQ')).toMatchObject({ provider: 'youtube', externalId: 'dQw4w9WgXcQ' });
  });
});

describe('parseVideoLink — TikTok', () => {
  it('parses a full video URL', () => {
    expect(parseVideoLink('https://www.tiktok.com/@coach/video/7212345678901234567')).toMatchObject({
      provider: 'tiktok',
      externalId: '7212345678901234567',
    });
  });
  it('rejects vm.tiktok.com short links (cannot resolve client-side)', () => {
    expect(parseVideoLink('https://vm.tiktok.com/ZMabcde/')).toBeNull();
  });
});

describe('parseVideoLink — Vimeo', () => {
  it('parses vimeo.com/<id> and player URLs', () => {
    expect(parseVideoLink('https://vimeo.com/123456789')).toMatchObject({ provider: 'vimeo', externalId: '123456789' });
    expect(parseVideoLink('https://player.vimeo.com/video/123456789')).toMatchObject({
      provider: 'vimeo',
      externalId: '123456789',
    });
  });
});

describe('parseVideoLink — junk', () => {
  it('returns null for empty, non-URLs, and unsupported hosts', () => {
    expect(parseVideoLink('')).toBeNull();
    expect(parseVideoLink('not a url')).toBeNull();
    expect(parseVideoLink('https://example.com/video/123')).toBeNull();
    expect(parseVideoLink('https://www.youtube.com/watch?v=tooShort')).toBeNull();
  });
});

describe('embedUrl / thumbnailUrl', () => {
  it('builds provider-specific embed URLs', () => {
    expect(embedUrl('youtube', 'abc12345678')).toBe('https://www.youtube-nocookie.com/embed/abc12345678');
    expect(embedUrl('tiktok', '7212345678901234567')).toBe('https://www.tiktok.com/embed/v2/7212345678901234567');
    expect(embedUrl('vimeo', '123456789')).toBe('https://player.vimeo.com/video/123456789');
  });
  it('derives a YouTube thumbnail and returns null for others', () => {
    expect(thumbnailUrl('youtube', 'abc12345678')).toBe('https://img.youtube.com/vi/abc12345678/hqdefault.jpg');
    expect(thumbnailUrl('tiktok', '721')).toBeNull();
    expect(thumbnailUrl('vimeo', '123')).toBeNull();
  });
});
