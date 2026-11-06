import { getStorageAdapter } from '@/lib/storage';
import { readPublicWall } from '@/lib/patrons/wall';
import { pageMetadata } from '@/lib/site/metadata';
import { UtilityPage } from '@/components/site/scrollcraft/UtilityPage';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata(
  'Patron wall',
  '/patrons',
  'The community wall and private display requests for What Am I Appreciating Now.',
  'patrons',
);
export default async function Patrons() {
  const wall = await readPublicWall(getStorageAdapter()).catch(() => ({
    publishedAt: null,
    patrons: [],
  }));
  return (
    <UtilityPage name="patrons">
      <header className="utility-intro">
        <p className="eyebrow">Behind the work</p>
        <h1>Patron wall</h1>
        <p className="lead">
          A place for the people who want to be part of What Am I Appreciating
          Now.
        </p>
      </header>
      <div className="utility-workspace">
        {wall.patrons.length === 0 ? (
          <section className="utility-surface utility-wall">
            <h2>A space taking shape</h2>
            <p>
              Names appear here only after a person has reviewed the display
              request. There are no published names yet.
            </p>
          </section>
        ) : (
          <ul className="utility-wall-list">
            {wall.patrons.map((p) => (
              <li key={p.consentRef}>
                <strong>{p.displayName}</strong>
                {p.message && <p>{p.message}</p>}
              </li>
            ))}
          </ul>
        )}
        <section className="utility-reference">
          <h2>Your name, your choice</h2>
          <p>
            You can send a display request or ask to remove a name. A request
            takes no payment and does not purchase a membership or a place in a
            recording.
          </p>
          <div className="actions">
            <a className="button primary" href="/patrons/join" data-sc-primary>
              Request a name display
            </a>
            <a className="button" href="/patrons/remove">
              Remove my name
            </a>
          </div>
        </section>
      </div>
    </UtilityPage>
  );
}
