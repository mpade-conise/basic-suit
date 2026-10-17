import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Camera, Grid3X3, Heart, Link2, LockKeyhole, Settings, UserRound, Video } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import ProfileEditor from "./ProfileEditor.jsx";
import "./profile.css";

export default function ProfilePage({ user, onSignIn, onUpload, onNavigate, notify }) {
  const [tab, setTab] = useState("Videos");
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const metadata = user?.user_metadata || {};
  useEffect(() => {
    let alive = true;
    if (!user || !supabase) { setProfile(null); return () => { alive = false; }; }
    supabase.from("profiles").select("username,display_name,bio,website_url,avatar_url,cover_url,pronouns,country,city,account_type,is_verified,created_at").eq("id", user.id).maybeSingle().then(({ data }) => { if (alive && data) setProfile(data); });
    return () => { alive = false; };
  }, [user]);
  const displayName = profile?.display_name || metadata.display_name || metadata.full_name || metadata.name || user?.email?.split("@")[0] || "Your profile";
  const username = profile?.username || metadata.username || user?.email?.split("@")[0] || "creator";
  const avatar = profile?.avatar_url || metadata.avatar_url || metadata.picture || "";
  const cover = profile?.cover_url || "";
  const joined = useMemo(() => user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "", [user?.created_at]);
  if (!user) return <section className="profile-page"><div className="profile-empty"><span className="profile-icon"><LockKeyhole size={26}/></span><p className="profile-eyebrow">YOUR SPACE ON BASIC SUIT</p><h1>Your profile starts here.</h1><p>Sign in to manage your identity, share videos and build your community.</p><button className="profile-primary" onClick={onSignIn}>Log in or sign up</button></div></section>;
  return <section className="profile-page">
    <div className="profile-cover" style={cover ? { backgroundImage: `linear-gradient(90deg, #0d0d1188, #0d0d1122), url("${cover}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><div className="profile-cover-glow"/><button className="profile-cover-edit" onClick={() => setEditing(true)}><Camera size={15}/> Edit cover</button></div>
    <div className="profile-summary">
      <div className="profile-avatar-wrap">{avatar ? <img className="profile-avatar" src={avatar} alt={displayName}/> : <span className="profile-avatar profile-avatar-fallback"><UserRound size={34}/></span>}<span className="profile-online"/></div>
      <div className="profile-actions"><button className="profile-secondary" onClick={onUpload}><Video size={16}/> Create video</button><button className="profile-secondary" onClick={() => setEditing(true)} aria-label="Edit profile"><Settings size={17}/> Edit profile</button></div>
      <h1>{displayName} {(profile?.is_verified || metadata.is_verified) && <BadgeCheck size={19} className="profile-verified"/>}</h1>
      <p className="profile-handle">@{username}</p>
      <p className="profile-bio">{profile?.bio || metadata.bio || "Making space for creativity, community and the moments worth sharing."}</p>
      {(profile?.website_url || metadata.website) && <a className="profile-website" href={profile?.website_url || metadata.website} target="_blank" rel="noreferrer"><Link2 size={15}/>{(profile?.website_url || metadata.website).replace(/^https?:\/\//, "")}</a>}
      {(profile?.city || profile?.country || profile?.pronouns) && <p className="profile-joined">{[profile?.pronouns, profile?.city, profile?.country].filter(Boolean).join(" · ")}</p>}
      <div className="profile-stats"><span><strong>—</strong> Following</span><span><strong>—</strong> Followers</span><span><strong>—</strong> Likes</span></div>
      {joined && <p className="profile-joined">Joined {joined}</p>}
    </div>
    <div className="profile-content-tabs">{[{label:"Videos",icon:Grid3X3},{label:"Liked",icon:Heart},{label:"Saved",icon:LockKeyhole}].map(({label,icon:Icon})=><button key={label} className={tab===label?"profile-tab profile-tab-active":"profile-tab"} onClick={()=>setTab(label)}><Icon size={16}/>{label}</button>)}</div>
    <div className="profile-content-empty"><span className="profile-content-icon">{tab==="Videos"?<Video size={27}/>:tab==="Liked"?<Heart size={27}/>:<LockKeyhole size={27}/>}</span><h2>{tab==="Videos"?"Your videos will live here":tab==="Liked"?"Your liked videos":"Your saved videos"}</h2><p>{tab==="Videos"?"Publish your first video to start building your profile.":tab==="Liked"?"Videos you like will be collected here.":"Your private bookmarks are available here."}</p><button className="profile-primary" onClick={tab==="Videos"?onUpload:()=>onNavigate(tab==="Liked"?"For you":"Bookmarks")}>{tab==="Videos"?"Upload your first video":tab==="Liked"?"Discover videos":"Open bookmarks"}</button></div>
    {editing && <ProfileEditor user={user} supabase={supabase} onClose={() => setEditing(false)} notify={notify} onSaved={values => setProfile(current => ({ ...current, ...values }))}/>}
  </section>;
}
