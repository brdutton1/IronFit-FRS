import { describe, expect, it } from 'vitest';
import { embedUrl, parseYouTubeId, thumbnailUrl } from './youtube';

describe('parseYouTubeId', () => {
  it('parses the standard watch URL', () => {
    expect(parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses a watch URL with extra params', () => {
    expect(parseYouTubeId('https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=abc')).toBe('dQw4w9WgXcQ');
  });
  it('parses the short youtu.be form', () => {
    expect(parseYouTubeId('https://youtu.be/dQw4w9WgXcQ?si=xyz')).toBe('dQw4w9WgXcQ');
  });
  it('parses embed, shorts, and live forms', () => {
    expect(parseYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeId('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses the nocookie embed host', () => {
    expect(parseYouTubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('accepts a bare 11-char id', () => {
    expect(parseYouTubeId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('tolerates a missing protocol', () => {
    expect(parseYouTubeId('youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('returns null for junk and non-YouTube URLs', () => {
    expect(parseYouTubeId('')).toBeNull();
    expect(parseYouTubeId('not a url')).toBeNull();
    expect(parseYouTubeId('https://vimeo.com/12345')).toBeNull();
    expect(parseYouTubeId('https://www.youtube.com/watch?v=tooShort')).toBeNull();
  });
});

describe('thumbnailUrl / embedUrl', () => {
  it('builds the thumbnail URL', () => {
    expect(thumbnailUrl('dQw4w9WgXcQ')).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
  it('builds the privacy-friendly embed URL', () => {
    expect(embedUrl('dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
});
