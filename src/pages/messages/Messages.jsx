import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, MessageCircle, Plus, Search, Send, Users, X } from "lucide-react";
import { supabase } from "../../lib/supabase.js";
import "./messages.css";

const avatarFallback = "https://i.pravatar.cc/100?img=11";
const nameOf = p => p?.display_name || p?.username || "Community member";
const initials = p => nameOf(p).split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();

export default function MessagesPage({ user, onSignIn, notify }) {
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadThreads = useCallback(async () => {
    if (!supabase || !user) { setThreads([]); setLoading(false); return; }
    setLoading(true);
    const { data: memberships, error: memberError } = await supabase.from("conversation_members").select("conversation_id,last_read_at").eq("user_id", user.id);
    if (memberError) { setLoading(false); notify("Messaging setup is incomplete. Run supabase/messaging.sql in Supabase SQL Editor."); return; }
    const ids = (memberships || []).map(x => x.conversation_id);
    if (!ids.length) { setThreads([]); setLoading(false); return; }
    const [{ data: conversations, error }, { data: members }, { data: latest }] = await Promise.all([
      supabase.from("conversations").select("id,created_at,updated_at").in("id", ids).order("updated_at", { ascending: false }),
      supabase.from("conversation_members").select("conversation_id,user_id,profiles(id,username,display_name,avatar_url)").in("conversation_id", ids),
      supabase.from("messages").select("id,conversation_id,sender_id,body,created_at,read_at").in("conversation_id", ids).is("deleted_at", null).order("created_at", { ascending: false })
    ]);
    setLoading(false);
    if (error) { notify("Could not load conversations."); return; }
    const readMap = new Map((memberships || []).map(x => [x.conversation_id, x.last_read_at]));
    const latestMap = new Map();
    (latest || []).forEach(m => { if (!latestMap.has(m.conversation_id)) latestMap.set(m.conversation_id, m); });
    setThreads((conversations || []).map(c => {
      const participants = (members || []).filter(m => m.conversation_id === c.id && m.user_id !== user.id).map(m => m.profiles).filter(Boolean);
      const last = latestMap.get(c.id);
      return { ...c, person: participants[0] || { username: "conversation", display_name: "Conversation" }, last, lastReadAt: readMap.get(c.id) };
    }).sort((a,b) => new Date(b.last?.created_at || b.updated_at) - new Date(a.last?.created_at || a.updated_at)));
  }, [user, notify]);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  useEffect(() => {
    if (!supabase || !user || !activeId) { setMessages([]); return; }
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase.from("messages").select("id,conversation_id,sender_id,body,created_at,read_at,profiles(username,display_name,avatar_url)").eq("conversation_id", activeId).is("deleted_at", null).order("created_at", { ascending: true }).limit(300);
      if (!alive) return;
      if (error) { notify("Could not load messages."); return; }
      setMessages(data || []);
      const now = new Date().toISOString();
      await supabase.from("conversation_members").update({ last_read_at: now }).eq("conversation_id", activeId).eq("user_id", user.id);
    };
    load();
    const channel = supabase.channel("messages-" + activeId).on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: "conversation_id=eq." + activeId }, load).subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [activeId, user, notify]);

  useEffect(() => {
    if (!showNew || !supabase || !user) { setPeople([]); return; }
    let alive = true;
    const timer = window.setTimeout(async () => {
      let request = supabase.from("profiles").select("id,username,display_name,avatar_url").neq("id", user.id).limit(20);
      if (peopleSearch.trim()) request = request.or("username.ilike.%" + peopleSearch.trim().replace(/[%_,]/g, "") + "%,display_name.ilike.%" + peopleSearch.trim().replace(/[%_,]/g, "") + "%");
      const { data } = await request;
      if (alive) setPeople(data || []);
    }, 220);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [showNew, peopleSearch, user]);

  const activeThread = threads.find(t => t.id === activeId);
  const visibleThreads = useMemo(() => threads.filter(t => [nameOf(t.person), t.person?.username, t.last?.body].join(" ").toLowerCase().includes(search.toLowerCase())), [threads, search]);

  const openPerson = async person => {
    if (!user || !supabase) { onSignIn(); return; }
    const existing = threads.find(t => t.person?.id === person.id);
    if (existing) { setActiveId(existing.id); setShowNew(false); return; }
    const { data: created, error } = await supabase.from("conversations").insert({ created_by: user.id }).select("id,created_at,updated_at").single();
    if (error) { notify("Could not start conversation: " + error.message); return; }
    const { error: memberError } = await supabase.from("conversation_members").insert([{ conversation_id: created.id, user_id: user.id }, { conversation_id: created.id, user_id: person.id }]);
    if (memberError) { await supabase.from("conversations").delete().eq("id", created.id); notify("Could not add conversation participants. Check the messaging database setup."); return; }
    setThreads(old => [{ ...created, person, last: null }, ...old]);
    setActiveId(created.id);
    setShowNew(false);
    setPeopleSearch("");
  };

  const sendMessage = async e => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !activeId || sending) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ conversation_id: activeId, sender_id: user.id, body });
    setSending(false);
    if (error) { notify("Message could not be sent: " + error.message); return; }
    setDraft("");
    await loadThreads();
  };

  if (!user) return <section className="messages-page"><div className="messages-welcome"><span className="messages-welcome-icon"><MessageCircle size={27}/></span><h1>Your inbox, your community</h1><p>Have private conversations with creators and people you follow.</p><button className="primary-button" onClick={onSignIn}>Sign in to open messages</button></div></section>;

  return <section className="messages-page">
    <header className="messages-heading"><div><span className="eyebrow"><MessageCircle size={13}/> PRIVATE CONVERSATIONS</span><h1>Messages</h1><p>Keep the conversation going.</p></div><button className="messages-new-button" onClick={() => { setShowNew(true); setActiveId(""); }}><Plus size={16}/> New message</button></header>
    <div className="messages-workspace">
      <aside className={"messages-inbox " + (activeId ? "inbox-hidden-mobile" : "")}>
        <label className="messages-search"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations"/></label>
        {loading ? <div className="messages-empty">Loading conversations…</div> : visibleThreads.length ? visibleThreads.map(t => <button key={t.id} className={"message-thread " + (activeId === t.id ? "thread-active" : "")} onClick={() => { setActiveId(t.id); setShowNew(false); }}><span className="message-avatar"><img src={t.person?.avatar_url || avatarFallback} alt=""/><i/></span><span className="thread-copy"><strong>{nameOf(t.person)}</strong><small>@{t.person?.username || "member"}</small><span>{t.last?.sender_id === user.id ? "You: " : ""}{t.last?.body || "Start a conversation"}</span></span>{t.last && !t.last.read_at && t.last.sender_id !== user.id && <i className="thread-unread"/>}</button>) : <div className="messages-empty"><MessageCircle size={23}/><strong>No conversations yet</strong><span>Start a conversation with someone in your community.</span><button onClick={() => setShowNew(true)}>Find people</button></div>}
      </aside>
      <div className={"messages-conversation " + (!activeId && !showNew ? "conversation-empty-mobile" : "")}>
        {showNew ? <div className="messages-new-panel"><div className="conversation-top"><button className="messages-back" onClick={() => setShowNew(false)}><ArrowLeft size={17}/></button><div><strong>New message</strong><small>Choose someone to message</small></div><button className="messages-back" onClick={() => setShowNew(false)}><X size={17}/></button></div><label className="messages-search people-search"><Search size={16}/><input autoFocus value={peopleSearch} onChange={e => setPeopleSearch(e.target.value)} placeholder="Search by name or username"/></label><div className="people-results">{people.map(p => <button key={p.id} className="person-result" onClick={() => openPerson(p)}><span className="message-avatar"><img src={p.avatar_url || avatarFallback} alt=""/></span><span><strong>{nameOf(p)}</strong><small>@{p.username}</small></span><MessageCircle size={17}/></button>)}</div></div>
        : activeThread ? <><div className="conversation-top"><button className="messages-back mobile-back" onClick={() => setActiveId("")}><ArrowLeft size={17}/></button><span className="message-avatar"><img src={activeThread.person?.avatar_url || avatarFallback} alt=""/></span><div><strong>{nameOf(activeThread.person)}</strong><small>@{activeThread.person?.username || "member"}</small></div></div><div className="messages-history">{messages.length ? messages.map(m => <div key={m.id} className={"message-row " + (m.sender_id === user.id ? "message-own" : "")}>{m.sender_id !== user.id && <img src={m.profiles?.avatar_url || avatarFallback} alt=""/>}<div className="message-bubble"><p>{m.body}</p><time>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></div></div>) : <div className="messages-first"><MessageCircle size={24}/><strong>Say hello</strong><span>This is the start of your conversation.</span></div>}</div><form className="message-compose" onSubmit={sendMessage}><input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write a message…" maxLength={4000}/><button type="submit" disabled={!draft.trim() || sending} aria-label="Send message">{sending ? <span className="send-spinner"/> : <Send size={17}/>}</button></form></>
        : <div className="messages-placeholder"><span><Users size={27}/></span><h2>Your conversations live here</h2><p>Select a conversation or start a new one to message someone privately.</p><button className="primary-button" onClick={() => setShowNew(true)}><Plus size={15}/> Start a conversation</button></div>}
      </div>
    </div>
  </section>;
}
