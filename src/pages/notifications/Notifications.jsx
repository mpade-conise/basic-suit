import { useEffect, useState } from "react";
import { Bell, Heart, MessageCircle, UserPlus, CheckCheck, Clock3 } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import "./notifications.css";

const icons = { like: Heart, comment: MessageCircle, follow: UserPlus, mention: Bell };
const labels = { like: "liked your video", comment: "commented on your video", follow: "started following you", mention: "mentioned you" };

export default function NotificationsPage({ user, onSignIn, notify }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    let alive = true;
    if (!user || !supabase) { setItems([]); setLoading(false); return () => { alive = false; }; }
    setLoading(true);
    supabase.from("notifications").select("id,kind,read_at,created_at,actor_id,video_id,profiles!notifications_actor_id_fkey(username,display_name,avatar_url)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100).then(({ data, error }) => {
      if (!alive) return;
      setLoading(false);
      if (error) { notify("Could not load notifications."); return; }
      setItems((data || []).map(n => ({ ...n, actor: n.profiles || null })));
    });
    return () => { alive = false; };
  }, [user]);
  const markRead = async ids => {
    if (!user || !supabase || !ids.length) return;
    const now = new Date().toISOString();
    setItems(old => old.map(n => ids.includes(n.id) ? { ...n, read_at: now } : n));
    const { error } = await supabase.from("notifications").update({ read_at: now }).in("id", ids).eq("user_id", user.id);
    if (error) notify("Could not update notification status.");
  };
  const markAllRead = () => markRead(items.filter(n => !n.read_at).map(n => n.id));
  const shown = filter === "unread" ? items.filter(n => !n.read_at) : items;
  const unread = items.filter(n => !n.read_at).length;
  if (!user) return <section className="notifications-page"><div className="notifications-hero"><span className="notifications-icon"><Bell size={25}/></span><h1>Your notifications</h1><p>Keep up with follows, comments, and reactions from your community.</p><button className="primary-button" onClick={onSignIn}>Sign in to view notifications</button></div></section>;
  return <section className="notifications-page">
    <header className="notifications-heading"><div><span className="eyebrow"><Bell size={13}/> YOUR COMMUNITY</span><h1>Notifications</h1><p>Stay connected to the people and posts that matter.</p></div><button className="mark-all-read" onClick={markAllRead} disabled={!unread}><CheckCheck size={16}/> Mark all read</button></header>
    <div className="notifications-toolbar"><div className="notifications-filters"><button className={filter==="all"?"selected":""} onClick={()=>setFilter("all")}>All <span>{items.length}</span></button><button className={filter==="unread"?"selected":""} onClick={()=>setFilter("unread")}>Unread <span>{unread}</span></button></div><span className="notifications-live"><i/> Updates from your network</span></div>
    {loading ? <div className="notifications-empty"><Clock3 size={27}/><p>Loading your notifications…</p></div> : shown.length ? <div className="notification-list">{shown.map(n=>{const Icon=icons[n.kind]||Bell;return <article key={n.id} className={"notification-item "+(!n.read_at?"unread":"")}><span className={"notification-kind kind-"+n.kind}><Icon size={17}/></span><span className="notification-avatar"><img src={n.actor?.avatar_url||"https://i.pravatar.cc/100?img=11"} alt=""/></span><div className="notification-copy"><p><strong>{n.actor?.display_name||n.actor?.username||"A community member"}</strong> {labels[n.kind]||"interacted with your content"}.</p><time>{new Date(n.created_at).toLocaleString()}</time></div>{!n.read_at&&<button className="notification-unread-dot" title="Mark as read" aria-label="Mark notification as read" onClick={()=>markRead([n.id])}/>}</article>;})}</div> : <div className="notifications-empty"><span className="notifications-empty-icon"><Bell size={25}/></span><strong>{filter==="unread"?"You're all caught up":"No notifications yet"}</strong><p>{filter==="unread"?"There are no unread notifications.":"When people follow you, like your videos, or comment, you'll see it here."}</p></div>}
  </section>;
}
