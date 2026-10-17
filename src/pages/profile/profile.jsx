import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Camera, Grid3X3, Heart, Link2, LockKeyhole, Settings, UserRound, Video, Play, LoaderCircle } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import ProfileEditor from "./ProfileEditor.jsx";
import "./profile.css";

const compact = value => Number(value || 0).toLocaleString();
const videoFields = "id,caption,video_url,thumbnail_url,created_at,likes_count,comments_count";

export default function ProfilePage({ user, onSignIn, onUpload, onNavigate, notify }) {
  const [tab, setTab] = useState("Videos");
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, likes: 0 });
  const [content, setContent] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [contentRefresh, setContentRefresh] = useState(0);
  const metadata = user?.user_metadata || {};

  useEffect(() => {
    let alive = true;
    if (!user || !supabase) { setProfile(null); setStats({ followers: 0, following: 0, likes: 0 }); setContent([]); return () => { alive = false; }; }
    const loadProfile = async () => {
      const [profileResult, videosResult, followersResult, followingResult] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("videos").select(videoFields).eq("user_id", user.id).order("created_at", { ascending: false }).limit(60),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", user.id)
      ]);
      if (!alive) return;
      if (profileResult.error) console.error("Profile load failed:", profileResult.error.message);
      if (profileResult.data) setProfile(profileResult.data);
      if (videosResult.error) setContentError("Could not load your videos. Check the videos table and its permissions.");
      else {
        const videos = Array.isArray(videosResult.data) ? videosResult.data : [];
        setContent(videos);
        setStats(current => ({ ...current, likes: videos.reduce((sum, video) => sum + Number(video?.likes_count || 0), 0) }));
      }
      setStats(current => ({ ...current, followers: followersResult.count || 0, following: followingResult.count || 0 }));
    };
    loadProfile().catch(error => { if (alive) { console.error("Profile loading failed:", error); setContentError("Could not load profile information. Please try again."); } });
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    let alive = true;
    if (tab === "Videos") { setContentLoading(false); return () => { alive = false; }; }
    if (!user || !supabase) { setContentLoading(false); return () => { alive = false; }; }
    setContentLoading(true); setContentError("");
    const load = async () => {
      const table = tab === "Liked" ? "likes" : "bookmarks";
      const { data: rows, error } = await supabase.from(table).select("video_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60);
      if (!alive) return;
      if (error) { setContentError(error.message || "Could not load this collection."); setContent([]); setContentLoading(false); return; }
      const ids = (Array.isArray(rows) ? rows : []).map(row => row?.video_id).filter(Boolean);
      if (!ids.length) { setContent([]); setContentLoading(false); return; }
      const { data: videos, error: videosError } = await supabase.from("videos").select(videoFields).in("id", ids).order("created_at", { ascending: false });
      if (!alive) return;
      if (videosError) { setContentError(videosError.message || "Could not load the videos in this collection."); setContent([]); }
      else setContent(Array.isArray(videos) ? videos : []);
      setContentLoading(false);
    };
    load().catch(error => { if (alive) { setContentError(error?.message || "Could not load this collection."); setContent([]); setContentLoading(false); } });
    return () => { alive = false; };
  }, [user, tab, contentRefresh]);

  const displayName = profile?.display_name || metadata.display_name || metadata.full_name || metadata.name || user?.email?.split("@")[0] || "Your profile";
  const username = profile?.username || metadata.username || user?.email?.split("@")[0] || "creator";
  const avatar = profile?.avatar_url || metadata.avatar_url || metadata.picture || "";
  const cover = profile?.cover_url || "";
  const bio = typeof profile?.bio === "string" ? profile.bio : (metadata.bio || "");
  const website = profile?.website_url || metadata.website || "";
  const joined = useMemo(() => user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "", [user?.created_at]);
  if (!user) return <section className="profile-page"><div className="profile-empty"><span className="profile-icon"><LockKeyhole size={26}/></span><p className="profile-eyebrow">YOUR SPACE ON BASIC SUIT</p><h1>Your profile starts here.</h1><p>Sign in to manage your identity, share videos and build your community.</p><button className="profile-primary" onClick={onSignIn}>Log in or sign up</button></div></section>;

  return <section className="profile-page">
    <div className="profile-cover" style={cover ? { backgroundImage: `linear-gradient(90deg, #0d0d1188, #0d0d1122), url("${cover}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><div className="profile-cover-glow"/><button className="profile-cover-edit" onClick={() => setEditing(true)}><Camera size={15}/> Edit cover</button></div>
    <div className="profile-summary">
      <div className="profile-avatar-wrap">{avatar ? <img className="profile-avatar" src={avatar} alt={displayName}/> : <span className="profile-avatar profile-avatar-fallback"><UserRound size={34}/></span>}<span className="profile-online"/></div>
      <div className="profile-actions"><button className="profile-secondary" onClick={onUpload}><Video size={16}/> Create video</button><button className="profile-secondary" onClick={() => setEditing(true)} aria-label="Edit profile"><Settings size={17}/> Edit profile</button></div>
      <h1>{displayName} {(profile?.is_verified || metadata.is_verified) && <BadgeCheck size={19} className="profile-verified"/>}</h1>
      <p className="profile-handle">@{username}</p>
      <p className="profile-bio">{bio || "Making space for creativity, community and the moments worth sharing."}</p>
      {website && <a className="profile-website" href={website} target="_blank" rel="noreferrer"><Link2 size={15}/>{website.replace(/^https?:\/\//, "")}</a>}
      {(profile?.city || profile?.country || profile?.pronouns) && <p className="profile-joined">{[profile?.pronouns, profile?.city, profile?.country].filter(Boolean).join(" · ")}</p>}
      <div className="profile-stats"><span><strong>{compact(stats.following)}</strong> Following</span><span><strong>{compact(stats.followers)}</strong> Followers</span><span><strong>{compact(stats.likes)}</strong> Likes</span></div>
      {joined && <p className="profile-joined">Joined {joined}</p>}
    </div>
    <div className="profile-content-tabs">{[{label:"Videos",icon:Grid3X3},{label:"Liked",icon:Heart},{label:"Saved",icon:LockKeyhole}].map(({label,icon:Icon})=><button key={label} className={tab===label?"profile-tab profile-tab-active":"profile-tab"} onClick={()=>setTab(label)}><Icon size={16}/>{label}</button>)}</div>
    {contentLoading ? <div className="profile-content-status"><LoaderCircle size={22} className="profile-spinner"/>Loading {tab.toLowerCase()}…</div> : contentError ? <div className="profile-content-status profile-content-error">{contentError}<button className="profile-secondary" onClick={() => setContentRefresh(value => value + 1)}>Try again</button></div> : content.length ? <div className="profile-video-grid">{content.map(video=><a className="profile-video-card" key={video.id} href={video.video_url || "#"} target="_blank" rel="noreferrer" aria-label={video.caption || "Open video"}><div className="profile-video-thumb">{video.thumbnail_url ? <img src={video.thumbnail_url} alt="" loading="lazy"/> : video.video_url ? <video src={video.video_url} muted preload="metadata" playsInline/> : <Video size={28}/>}<span className="profile-video-play"><Play size={19} fill="currentColor"/></span><span className="profile-video-likes"><Heart size={13} fill="currentColor"/>{compact(video.likes_count)}</span></div><p>{video.caption || "Untitled video"}</p><small>{video.created_at ? new Date(video.created_at).toLocaleDateString() : ""}</small></a>)}</div> : <div className="profile-content-empty"><span className="profile-content-icon">{tab==="Videos"?<Video size={27}/>:tab==="Liked"?<Heart size={27}/>:<LockKeyhole size={27}/>}</span><h2>{tab==="Videos"?"Your videos will live here":tab==="Liked"?"Your liked videos":"Your saved videos"}</h2><p>{tab==="Videos"?"Publish your first video to start building your profile.":tab==="Liked"?"Videos you like will be collected here.":"Your private bookmarks are available here."}</p><button className="profile-primary" onClick={tab==="Videos"?onUpload:()=>onNavigate(tab==="Liked"?"For you":"Bookmarks")}>{tab==="Videos"?"Upload your first video":tab==="Liked"?"Discover videos":"Open bookmarks"}</button></div>}
    {editing && <ProfileEditor user={user} supabase={supabase} onClose={() => setEditing(false)} notify={notify} onSaved={values => setProfile(current => ({ ...current, ...values }))}/>}
  </section>;
}
