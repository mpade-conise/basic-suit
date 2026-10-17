import { useEffect, useState } from "react";
import { Save, X, UserRound, Globe, MapPin } from "lucide-react";

const emptyProfile = { username: "", display_name: "", bio: "", website_url: "", avatar_url: "", cover_url: "", pronouns: "", country: "", city: "", account_type: "personal" };
const safeProfile = data => Object.fromEntries(Object.keys(emptyProfile).map(key => [key, typeof data?.[key] === "string" ? data[key] : emptyProfile[key]]));

export default function ProfileEditor({ user, supabase, onClose, onSaved, notify }) {
  const [form, setForm] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    if (!supabase || !user) { setLoading(false); setError("Sign in and connect Supabase to edit your profile."); return () => { alive = false; }; }
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data, error: fetchError }) => {
      if (!alive) return;
      if (fetchError) setError(fetchError.message);
      if (data) setForm(safeProfile(data));
      else setForm({ ...emptyProfile, username: user.email?.split("@")[0]?.replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 24) || "creator", display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Creator" });
      setLoading(false);
    }).catch(fetchError => { if (alive) { setError(fetchError?.message || "Could not load your profile."); setLoading(false); } });
    return () => { alive = false; };
  }, [supabase, user]);

  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const submit = async event => {
    event.preventDefault();
    if (!supabase || !user) { setError("You must be signed in to save profile changes."); return; }
    const username = String(form.username || "").trim().toLowerCase();
    const display_name = String(form.display_name || "").trim();
    if (!/^[a-z0-9_.]{3,30}$/.test(username)) { setError("Username must be 3–30 characters using letters, numbers, underscores or periods."); return; }
    if (!display_name) { setError("Display name is required."); return; }
    setSaving(true); setError("");
    const payload = { username, display_name, bio: String(form.bio || "").trim(), website_url: String(form.website_url || "").trim() || null, avatar_url: String(form.avatar_url || "").trim() || null, cover_url: String(form.cover_url || "").trim() || null, pronouns: String(form.pronouns || "").trim() || null, country: String(form.country || "").trim() || null, city: String(form.city || "").trim() || null, account_type: form.account_type || "personal", updated_at: new Date().toISOString() };
    const { data, error: saveError } = await supabase.from("profiles").update(payload).eq("id", user.id).select("id").maybeSingle();
    setSaving(false);
    if (saveError) { setError(saveError.code === "23505" ? "That username is already taken. Choose another one." : saveError.message); return; }
    if (!data) { setError("Profile was not updated. Check that your Supabase profile row exists and your row-level security policies allow updates."); return; }
    onSaved?.(payload);
    notify?.("Profile updated successfully.");
    onClose();
  };

  return <div className="profile-editor-backdrop" onClick={onClose}><section className="profile-editor" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title" onClick={event => event.stopPropagation()}>
    <header className="profile-editor-header"><div><span className="profile-eyebrow">YOUR IDENTITY</span><h2 id="profile-editor-title">Edit profile</h2></div><button type="button" className="profile-editor-close" onClick={onClose} aria-label="Close editor"><X size={20}/></button></header>
    {loading ? <div className="profile-editor-loading">Loading your profile…</div> : <form onSubmit={submit} className="profile-editor-form">
      <label>Display name<input value={form.display_name} onChange={event => change("display_name", event.target.value)} maxLength={80} required placeholder="Your name"/></label>
      <label>Username<input value={form.username} onChange={event => change("username", event.target.value)} maxLength={30} minLength={3} required placeholder="your.username"/><small>3–30 characters: letters, numbers, periods and underscores.</small></label>
      <label>Bio<textarea value={form.bio} onChange={event => change("bio", event.target.value)} maxLength={300} rows={3} placeholder="Tell people what you create or care about."/><small>{String(form.bio || "").length}/300</small></label>
      <label><span><Globe size={14}/> Website</span><input type="url" value={form.website_url} onChange={event => change("website_url", event.target.value)} placeholder="https://example.com"/></label>
      <label><span><UserRound size={14}/> Avatar image URL</span><input type="url" value={form.avatar_url} onChange={event => change("avatar_url", event.target.value)} placeholder="https://…"/></label>
      <label>Cover image URL<input type="url" value={form.cover_url} onChange={event => change("cover_url", event.target.value)} placeholder="https://…"/></label>
      <label>Pronouns<input value={form.pronouns} onChange={event => change("pronouns", event.target.value)} maxLength={40} placeholder="Optional"/></label>
      <div className="profile-editor-grid"><label><span><MapPin size={14}/> Country</span><input value={form.country} onChange={event => change("country", event.target.value)} maxLength={80} placeholder="Country"/></label><label>City<input value={form.city} onChange={event => change("city", event.target.value)} maxLength={80} placeholder="City"/></label></div>
      <label>Account type<select value={form.account_type} onChange={event => change("account_type", event.target.value)}><option value="personal">Personal</option><option value="creator">Creator</option><option value="business">Business</option></select></label>
      {error && <p className="profile-editor-error" role="alert">{error}</p>}
      <footer><button type="button" className="profile-secondary" onClick={onClose}>Cancel</button><button type="submit" className="profile-primary" disabled={saving}><Save size={15}/>{saving ? "Saving…" : "Save changes"}</button></footer>
    </form>}
  </section></div>;
}
