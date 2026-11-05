import type { Metadata } from 'next';
import { SITE_NAME } from './content';
export function pageMetadata(
  title: string,
  path: string,
  description: string,
  family = 'home',
): Metadata {
  return {
    title: `${title} · ${SITE_NAME}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url: path,
      siteName: SITE_NAME,
      images: [
        {
          url: `/brand/share/${family}.png`,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${title}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · ${SITE_NAME}`,
      description,
      images: [`/brand/share/${family}.png`],
    },
  };
}
