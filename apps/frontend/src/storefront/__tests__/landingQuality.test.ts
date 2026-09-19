import { describe, expect, it } from 'vitest';

import {
  getLandingQualityIssues,
  hasCriticalLandingIssues,
} from '../../pages/advertising/product-landing/landingQuality';
import { DEFAULT_EDITOR } from '../../pages/advertising/product-landing/types';
import type { EditorState } from '../../pages/advertising/product-landing/types';

const editorWith = (sections: unknown[], seo?: EditorState['seo']): EditorState => ({
  ...DEFAULT_EDITOR,
  sections: sections as EditorState['sections'],
  seo,
});

describe('getLandingQualityIssues', () => {
  it('flags identical before/after images as critical', () => {
    const issues = getLandingQualityIssues(
      editorWith([
        {
          id: 'ba-1',
          type: 'BEFORE_AFTER',
          enabled: true,
          content: { beforeImage: '/same.png', afterImage: '/same.png' },
        },
      ]),
    );

    const critical = issues.filter((i) => i.severity === 'critical');
    expect(critical).toHaveLength(1);
    expect(critical[0].label).toContain('قبل وبعد');
    expect(hasCriticalLandingIssues(issues)).toBe(true);
  });

  it('flags stock video domains as critical, passes self-hosted videos', () => {
    const stock = getLandingQualityIssues(
      editorWith([
        {
          id: 'vr-1',
          type: 'VIDEO_REEL',
          enabled: true,
          content: { videoUrl: 'https://assets.mixkit.co/videos/x.mp4' },
        },
      ]),
    );
    expect(hasCriticalLandingIssues(stock)).toBe(true);

    const real = getLandingQualityIssues(
      editorWith([
        {
          id: 'vr-1',
          type: 'VIDEO_REEL',
          enabled: true,
          content: { videoUrl: 'https://swan.maxp.online/uploads/real.mp4' },
        },
      ]),
    );
    expect(hasCriticalLandingIssues(real)).toBe(false);
  });

  it('skips disabled sections', () => {
    const issues = getLandingQualityIssues(
      editorWith([
        {
          id: 'ba-1',
          type: 'BEFORE_AFTER',
          enabled: false,
          content: { beforeImage: '/x.png', afterImage: '/x.png' },
        },
      ]),
    );
    expect(hasCriticalLandingIssues(issues)).toBe(false);
  });

  it('warns on empty SEO and image-less media sections (advisory only)', () => {
    const issues = getLandingQualityIssues(
      editorWith([
        { id: 'm-1', type: 'MEDIA', enabled: true, content: { images: [] } },
      ]),
    );

    expect(hasCriticalLandingIssues(issues)).toBe(false);
    expect(issues.every((i) => i.severity === 'warning')).toBe(true);
    expect(issues.some((i) => i.id.startsWith('media-empty'))).toBe(true);
    expect(issues.some((i) => i.id === 'seo-empty')).toBe(true);
  });

  it('clean landing passes with zero issues', () => {
    const issues = getLandingQualityIssues(
      editorWith(
        [
          {
            id: 'ba-1',
            type: 'BEFORE_AFTER',
            enabled: true,
            content: { beforeImage: '/a.png', afterImage: '/b.png' },
          },
        ],
        { title: 'عرض خاص', description: 'وصف' },
      ),
    );
    expect(issues).toHaveLength(0);
  });
});
