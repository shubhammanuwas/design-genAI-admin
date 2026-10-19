import Image from "next/image";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin";
import type { Generation, Profile, UserRecord, Vote, VoteCount } from "@/lib/database";
import { signOut, createGeneration, deleteGeneration, updateGeneration } from "./admin/actions";

export const dynamic = "force-dynamic";

function displayName(profile?: Profile) {
  if (!profile) return "Unknown profile";
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "New member";
}

function initials(profile?: Profile) {
  const name = displayName(profile);
  return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { supabase, user, isAdmin } = await requireAdminPage();
  if (!isAdmin) {
    return (
      <main className="login-screen">
        <section className="login-card">
          <div className="brand-mark">S<span>+</span></div>
          <p className="eyebrow">ADMIN ACCESS REQUIRED</p>
          <h1>Almost in.</h1>
          <p className="login-copy">Your Google account is signed in, but it does not have the superadmin role.</p>
          <p className="denied-note">
            In Supabase SQL Editor, set <code>profiles.is_superadmin</code> to <code>true</code> for your profile, then refresh.
          </p>
          <form action={signOut}><button className="quiet-button">Sign out</button></form>
        </section>
      </main>
    );
  }

  const [profilesResult, usersResult, generationsResult, votesResult, countsResult, profileCountResult, userCountResult, generationCountResult, voteCountResult] =
    await Promise.all([
      supabase.from("profiles").select("id, first_name, last_name, avatar_url, created_at, is_superadmin").order("created_at", { ascending: false }).limit(100),
      supabase.from("users").select("id, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.from("generations").select("id, user_id, photo_path, prompt, caption, created_at").order("created_at", { ascending: false }).limit(12),
      supabase.from("caption_votes").select("generation_id, user_id, value, created_at").order("created_at", { ascending: false }).limit(8),
      supabase.rpc("get_caption_vote_counts"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("generations").select("id", { count: "exact", head: true }),
      supabase.from("caption_votes").select("generation_id", { count: "exact", head: true }),
    ]);

  const queryError = profilesResult.error ?? usersResult.error ?? generationsResult.error ?? votesResult.error ?? countsResult.error ??
    profileCountResult.error ?? userCountResult.error ?? generationCountResult.error ?? voteCountResult.error;
  if (queryError) throw new Error(`Could not load admin data: ${queryError.message}`);

  const profiles = (profilesResult.data ?? []) as Profile[];
  const users = (usersResult.data ?? []) as UserRecord[];
  const generations = (generationsResult.data ?? []) as Generation[];
  const votes = (votesResult.data ?? []) as Vote[];
  const counts = (countsResult.data ?? []) as VoteCount[];
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const generationById = new Map(generations.map((generation) => [generation.id, generation]));
  const totalUpvotes = counts.reduce((sum, item) => sum + Number(item.upvotes), 0);
  const totalDownvotes = counts.reduce((sum, item) => sum + Number(item.downvotes), 0);
  const totalVotes = totalUpvotes + totalDownvotes;
  const positiveRate = totalVotes ? Math.round((totalUpvotes / totalVotes) * 100) : 0;
  const topCaption = [...counts].sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))[0];
  const topGeneration = topCaption ? generationById.get(topCaption.generation_id) : undefined;
  const notice = (await searchParams).notice;
  const today = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase();

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Studio Control home">
          <span className="brand-mark">S<span>+</span></span>
          <span className="brand-name">studio<span>control</span></span>
        </Link>
        <p className="side-label">WORKSPACE</p>
        <nav className="side-nav" aria-label="Dashboard sections">
          <a className="active" href="#overview"><span>◫</span>Overview</a>
          <a href="#members"><span>♙</span>Profiles <i>{profileCountResult.count ?? 0}</i></a>
          <a href="#media"><span>▧</span>AI media <i>{generationCountResult.count ?? 0}</i></a>
          <a href="#ratings"><span>↗</span>Ratings <i>{voteCountResult.count ?? 0}</i></a>
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" />
          <div><strong>Database connected</strong><small>Supabase · live data</small></div>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{initials(profileById.get(user!.id))}</div>
          <div className="sidebar-user-copy"><strong>{displayName(profileById.get(user!.id))}</strong><small>Superadmin</small></div>
          <form action={signOut}><button className="sign-out" aria-label="Sign out" title="Sign out">↗</button></form>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div><span className="breadcrumb">Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-right"><span className="today">LIVE DATABASE</span><span className="live-dot" /><span className="topbar-avatar">{initials(profileById.get(user!.id))}</span></div>
        </header>
        <div className="content">
          {notice ? <div className="success-banner" role="status">Media {notice} successfully.</div> : null}
          <section id="overview" className="intro">
            <div><p className="eyebrow">{today} · STUDIO PULSE</p><h1>The little things add up.</h1><p>Every image, idea, and vote — all in one place.</p></div>
            <a className="export-button" href="#media">＋ <span>Add a generation</span></a>
          </section>

          <section className="stat-grid" aria-label="Studio statistics">
            <article className="stat-card stat-violet"><div className="stat-top"><span className="stat-label">COMMUNITY</span><span className="stat-icon">♙</span></div><strong>{profileCountResult.count ?? 0}</strong><div className="stat-foot"><span className="spark">↗</span> creative minds in the room</div><div className="mini-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
            <article className="stat-card stat-peach"><div className="stat-top"><span className="stat-label">AI CREATIONS</span><span className="stat-icon">✳</span></div><strong>{generationCountResult.count ?? 0}</strong><div className="stat-foot"><span className="spark">✦</span> stories sparked into life</div><div className="mini-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
            <article className="stat-card stat-mint"><div className="stat-top"><span className="stat-label">TOTAL REACTIONS</span><span className="stat-icon">↗</span></div><strong>{totalVotes.toLocaleString()}</strong><div className="stat-foot"><span className="spark">↑</span> {totalUpvotes} up · {totalDownvotes} down</div><div className="mini-bars" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
            <article className="stat-card stat-blue"><div className="stat-top"><span className="stat-label">GOOD VIBES</span><span className="stat-icon">♡</span></div><strong>{positiveRate}<small>%</small></strong><div className="stat-foot"><span className="spark">✦</span> of all ratings are positive</div><div className="rate-meter"><span style={{ width: `${positiveRate}%` }} /></div></article>
          </section>

          <section className="highlight-grid">
            <article className="highlight-card">
              <div className="section-heading"><div><p className="eyebrow">CROWD FAVORITE</p><h2>Most loved right now</h2></div><span className="badge">TOP RATED</span></div>
              {topGeneration ? (
                <div className="favorite">
                  <div className="favorite-image"><Image src={supabase.storage.from("generation-photos").getPublicUrl(topGeneration.photo_path).data.publicUrl} alt="" fill sizes="140px" unoptimized /></div>
                  <div className="favorite-copy"><p className="caption-quote">“{topGeneration.caption}”</p><span>{(topCaption?.upvotes ?? 0)} upvotes <span className="middle-dot">·</span> by {displayName(profileById.get(topGeneration.user_id))}</span></div>
                  <span className="heart">♥</span>
                </div>
              ) : <p className="empty-copy">Add the first caption and let the community decide.</p>}
            </article>
            <article className="highlight-card vibe-card">
              <div className="section-heading"><div><p className="eyebrow">COMMUNITY MOOD</p><h2>The room is feeling…</h2></div><span className="mood-icon">☼</span></div>
              <div className="mood-value">{positiveRate >= 70 ? "Pretty lovely." : positiveRate >= 40 ? "A little mixed." : "Ready to surprise."}</div>
              <p className="muted-copy">The upvote-to-downvote mix across every caption.</p>
              <div className="sentiment-track"><span style={{ width: `${positiveRate}%` }} /></div>
              <div className="sentiment-labels"><span>↑ {totalUpvotes} love it</span><span>{totalDownvotes} not quite ↓</span></div>
            </article>
          </section>

          <section id="members" className="panel">
            <div className="section-heading panel-heading"><div><p className="eyebrow">THE PEOPLE BEHIND THE PROMPTS</p><h2>Community profiles <span className="count-pill">{profileCountResult.count ?? 0}</span></h2></div><span className="panel-meta">LATEST MEMBERS</span></div>
            {profiles.length ? <div className="profile-list">
              {profiles.slice(0, 8).map((profile) => <article className="profile-row" key={profile.id}>
                {profile.avatar_url ? <Image className="profile-avatar" src={profile.avatar_url} alt="" width={40} height={40} unoptimized /> : <div className="profile-avatar initials">{initials(profile)}</div>}
                <div className="profile-info"><strong>{displayName(profile)}</strong><span>{profile.id}</span></div>
                <span className="joined-date">Joined {formatDate(profile.created_at)}</span>
                {profile.is_superadmin ? <span className="admin-chip">SUPERADMIN</span> : <span className="member-chip">MEMBER</span>}
              </article>)}
            </div> : <p className="empty-copy">No profiles found.</p>}
          </section>

          <section className="panel">
            <div className="section-heading panel-heading"><div><p className="eyebrow">ACCOUNT ACTIVITY</p><h2>User records <span className="count-pill">{userCountResult.count ?? 0}</span></h2></div><span className="panel-meta">LATEST REGISTRATIONS</span></div>
            {users.length ? <div className="profile-list">
              {users.map((record) => <article className="profile-row" key={record.id}>
                <div className="profile-avatar initials">U</div>
                <div className="profile-info"><strong>User #{record.id}</strong><span>Public users table</span></div>
                <span className="joined-date">Created {formatDate(record.created_at)}</span>
                <span className="member-chip">REGISTERED</span>
              </article>)}
            </div> : <p className="empty-copy">No user records found.</p>}
          </section>

          <section id="media" className="panel">
            <div className="section-heading panel-heading"><div><p className="eyebrow">PROMPTS BECOME PICTURES</p><h2>AI-generated media <span className="count-pill">{generationCountResult.count ?? 0}</span></h2></div><span className="panel-meta">CREATE · EDIT · REMOVE</span></div>
            <form className="create-form" action={createGeneration}>
              <div className="form-heading"><span className="create-icon">＋</span><div><strong>Create a media entry</strong><span>Add a new image and caption to the community feed.</span></div></div>
              <div className="form-fields">
                <label>Profile<select name="user_id" required defaultValue=""><option value="" disabled>Choose a creator</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{displayName(profile)}</option>)}</select></label>
                <label>Image<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required /></label>
                <label className="wide-field">Prompt<input name="prompt" maxLength={500} required placeholder="What inspired this image?" /></label>
                <label className="wide-field">Caption<input name="caption" maxLength={500} required placeholder="Write a short caption…" /></label>
                <button className="primary-button" type="submit">Add to studio <span>↗</span></button>
              </div>
            </form>
            <div className="media-grid">
              {generations.map((generation) => <article className="media-card" key={generation.id}>
                <div className="media-image"><Image src={supabase.storage.from("generation-photos").getPublicUrl(generation.photo_path).data.publicUrl} alt="" fill sizes="(max-width: 700px) 100vw, 300px" unoptimized /></div>
                <div className="media-content">
                  <div className="media-topline"><span>{displayName(profileById.get(generation.user_id))}</span><time>{formatDate(generation.created_at)}</time></div>
                  <form action={updateGeneration} className="edit-form">
                    <input type="hidden" name="id" value={generation.id} />
                    <label>Caption<textarea name="caption" defaultValue={generation.caption} maxLength={500} required rows={2} /></label>
                    <label>Prompt<input name="prompt" defaultValue={generation.prompt} maxLength={500} required /></label>
                    <button className="text-button" type="submit">Save changes <span>↗</span></button>
                  </form>
                  <form action={deleteGeneration} className="delete-form">
                    <input type="hidden" name="id" value={generation.id} />
                    <button className="delete-button" type="submit">Remove generation</button>
                  </form>
                </div>
              </article>)}
            </div>
            {!generations.length ? <p className="empty-copy">No generations yet. Create one above to start the collection.</p> : null}
          </section>

          <section id="ratings" className="panel">
            <div className="section-heading panel-heading"><div><p className="eyebrow">THE COMMUNITY HAS SPOKEN</p><h2>Recent reactions <span className="count-pill">{voteCountResult.count ?? 0}</span></h2></div><span className="panel-meta">LATEST VOTES</span></div>
            {votes.length ? <div className="ratings-list">
              {votes.map((vote) => {
                const generation = generationById.get(vote.generation_id);
                const profile = profileById.get(vote.user_id);
                return <article className="rating-row" key={`${vote.generation_id}-${vote.user_id}`}>
                  <span className={`vote-mark ${vote.value === 1 ? "up" : "down"}`}>{vote.value === 1 ? "↑" : "↓"}</span>
                  <div className="rating-copy"><strong>{displayName(profile)}</strong><span>{vote.value === 1 ? "loved" : "passed on"} “{generation?.caption ?? "a removed generation"}”</span></div>
                  <time>{formatDate(vote.created_at)}</time>
                </article>;
              })}
            </div> : <p className="empty-copy">No ratings yet. Reactions will show here as they come in.</p>}
          </section>
          <footer className="footer"><span>STUDIO CONTROL <b>✳</b> BUILT FOR THE PEOPLE MAKING THINGS</span><span>SUPABASE · LIVE</span></footer>
        </div>
      </section>
    </main>
  );
}
