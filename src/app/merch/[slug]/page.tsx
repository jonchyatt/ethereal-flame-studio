import { ScrollPage } from '@/components/site/scrollcraft/ScrollPage';
import '@/components/site/scrollcraft/commerce.css';
import { notFound } from 'next/navigation';
import { EmailSignup } from '@/components/EmailSignup';
import { concepts } from '@/lib/site/content';
import { pageMetadata } from '@/lib/site/metadata';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = concepts.find((item) => item.slug === slug);
  return pageMetadata(
    c?.short || 'Design not found',
    `/merch/${slug}`,
    c?.description || 'Explore the design concepts.',
    'store',
  );
}
export default async function Design({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = concepts.find((item) => item.slug === slug);
  if (!c) notFound();
  const body = (
    <>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="/merch">← All design concepts</a>
      </nav>
      <article className="merch-detail" data-sc-act="concept" data-sc-flow>
        <img data-sc-parallax="0.04"
          src={`/brand/concepts/${c.image}`}
          alt={c.title + ' — full uncropped concept render'}
          width="1024"
          height="1024"
        />
        <div>
          <p className="eyebrow">Design concept</p>
          <h1>{c.title}</h1>
          <p className="lead">{c.description}</p>
          <p>
            Gemini concept render, not a physical product photograph or approved
            print file.
          </p>
          <div className="notice">
            <h2>Before it becomes an object</h2>
            <p>{c.note}</p>
            <p>This design is not made yet. Tell me when this is made.</p>
          </div>
          <a className="text-link" href="/merch">
            Return to all four designs →
          </a>
        </div>
      </article>
      <EmailSignup
        tag={`merch-${c.slug}`}
        heading="Tell me when this is made"
        question="Leave your email and you will be told when this design becomes a real thing."
      />
    </>
  );
  return <ScrollPage name="merch-detail">{body}</ScrollPage>;
}
