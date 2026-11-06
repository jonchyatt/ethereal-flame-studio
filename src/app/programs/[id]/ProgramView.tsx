import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getProgram, programSlug } from '@/lib/entitlements/catalog';
import { loadProgramContent } from '@/lib/entitlements/content';
import { hasAccess, loadRecord } from '@/lib/entitlements/model';
import {
  CUSTOMER_COOKIE,
  verifyCustomerCookie,
} from '@/lib/entitlements/session';
import { loadAudioManifest } from '@/lib/entitlements/audio';
import { SAFETY_NOTE } from '@/app/legal/LegalLinks';
import { AudioPlayer } from './AudioPlayer';
import { EmailSignup } from '@/components/EmailSignup';
import { ScrollPage } from '@/components/site/scrollcraft/ScrollPage';

export async function ProgramView({
  id,
  children,
}: {
  id: string;
  children?: React.ReactNode;
}) {
  const program = getProgram(id);
  if (!program) notFound();
  const slug = programSlug(program.id);
  let allowed = false;
  try {
    const customerId = verifyCustomerCookie(
      (await cookies()).get(CUSTOMER_COOKIE)?.value,
    );
    allowed =
      !!customerId && hasAccess(await loadRecord(customerId), program.id);
  } catch {}
  const content = allowed ? await loadProgramContent(program.id) : null;
  let tracks: { id: string; title: string }[] = [];
  if (allowed) {
    try {
      tracks = (await loadAudioManifest(id)).map(({ id: tid, title }) => ({
        id: tid,
        title,
      }));
    } catch {}
  }
  return (
    <ScrollPage name="program-detail">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="/programs">← Programs</a>
      </nav>
      {children || (
        <section className="program-hero" data-sc-act="flow">
          <div>
            <p className="eyebrow">A belief you choose</p>
            <h1>{program.title}</h1>
            <p className="lead">
              A guided process for exploring and strengthening a belief you
              choose.
            </p>
            <p>
              Not for sale yet; get told when it opens. You can hear a free
              appreciation moment now.
            </p>
            <a className="button primary" href="/listen?clip=19">
              Try free appreciation · 0:41
            </a>
          </div>
          <img
            data-sc-parallax="-0.35"
            className="story-mark"
            src="/brand/carving/04.png"
            alt="The original carved wood mark, not a program demo"
            width="1024"
            height="1024"
          />
        </section>
      )}
      {allowed && (
        <section className="section">
          <h2>Your program access</h2>
          {program.guided && (
            <a className="button" href={`/programs/${slug}/session`}>
              Open the guided process →
            </a>
          )}
          {tracks.length > 0 && (
            <AudioPlayer programId={program.id} tracks={tracks} />
          )}
          {content ? (
            <pre className="transcript">{content}</pre>
          ) : (
            <p>
              You have access. Contact <a href="/support">Support</a> if you
              need help with your materials.
            </p>
          )}
        </section>
      )}
      <section className="section quiet-panel" data-sc-act="flow">
        <h2>Make a little space to listen</h2>
        <p>
          Choose a quiet place where you can stop whenever you wish. Use the
          player controls to pause or return to a passage.
        </p>
        <p>{SAFETY_NOTE}</p>
        <a className="text-link" href="/listen">
          Explore the original appreciation moments →
        </a>
      </section>
      <EmailSignup
        tag={program.id}
        heading="Tell me when this opens"
        question="Not for sale yet. Leave your email and you will be told the day it opens."
      />
    </ScrollPage>
  );
}
