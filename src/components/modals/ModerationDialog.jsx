import { useState } from "react";
import { Flag, ShieldAlert, X } from "lucide-react";

const reasons = [
  ["spam", "Spam or misleading content"],
  ["harassment", "Harassment or bullying"],
  ["hate", "Hate or hateful conduct"],
  ["nudity", "Nudity or sexual content"],
  ["violence", "Violence or dangerous activity"],
  ["misinformation", "False or misleading information"],
  ["copyright", "Copyright or intellectual property"],
  ["other", "Something else"]
];

export default function ModerationDialog({ post, onClose, onReport, onBlock }) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async e => { e.preventDefault(); setBusy(true); await onReport(post, reason, details); setBusy(false); };
  return <div className="modal-backdrop" onClick={onClose}><section className="modal moderation-modal" onClick={e=>e.stopPropagation()}><div className="modal-heading"><div><span className="eyebrow"><ShieldAlert size={13}/> COMMUNITY SAFETY</span><h2>Post options</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X/></button></div><div className="moderation-target"><strong>{post.name || "Community creator"}</strong><p>{post.caption || "Video post"}</p></div><form onSubmit={submit}><label className="field-label">Why are you reporting this?<select value={reason} onChange={e=>setReason(e.target.value)}>{reasons.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="field-label">Additional details (optional)<textarea rows={3} maxLength={2000} value={details} onChange={e=>setDetails(e.target.value)} placeholder="Share details that can help a moderator review this report."/></label><button className="primary-button full-button" type="submit" disabled={busy}><Flag size={16}/>{busy?"Submitting report…":"Submit report"}</button></form><button className="moderation-block" onClick={()=>onBlock(post)}><ShieldAlert size={16}/> Block this creator</button><p className="modal-hint">Reports are private. Blocking hides this creator's posts from your feed.</p></section></div>;
}
