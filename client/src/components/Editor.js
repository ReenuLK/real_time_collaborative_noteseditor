
import React, { useMemo, useEffect, useState, useRef, useCallback } from "react";
import { createEditor, Transforms, Editor as SlateEditor } from "slate";
import { Slate, Editable, withReact, ReactEditor } from "slate-react";
import * as Y from "yjs";
import { withYjs, YjsEditor, withYHistory } from "@slate-yjs/core";
import { WebsocketProvider } from "y-websocket";
import { useParams } from "react-router-dom";

const WS_URL = "ws://localhost:1234";
const API_URL = "http://localhost:5000/api";
const INITIAL_VALUE = [{ type: "paragraph", children: [{ text: "" }] }];

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) children = <strong>{children}</strong>;
  if (leaf.italic) children = <em>{children}</em>;
  if (leaf.underline) children = <u>{children}</u>;
  const style = {
    fontSize: leaf.fontSize ? `${leaf.fontSize}px` : "18px",
    color: leaf.color ? leaf.color : "inherit",
  };
  return <span {...attributes} style={style}>{children}</span>;
};

const toggleMark = (editor, format) => {
  const marks = SlateEditor.marks(editor);
  const isActive = marks ? marks[format] === true : false;
  if (isActive) {
    SlateEditor.removeMark(editor, format);
  } else {
    SlateEditor.addMark(editor, format, true);
  }
};

function RemoteCursors({ awareness, editor }) {
  const [remoteCursors, setRemoteCursors] = useState([]);
  useEffect(() => {
    const update = () => {
      const states = awareness.getStates();
      const cursors = [];
      states.forEach((state, clientId) => {
        if (clientId === awareness.clientID || !state.cursor) return;
        try {
          const domRange = ReactEditor.toDOMRange(editor, state.cursor);
          const rect = domRange.getClientRects()[0];
          const parentRect = ReactEditor.toDOMNode(editor, editor).getBoundingClientRect();
          cursors.push({ 
            id: clientId, name: state.user?.name || "User", color: state.user?.color || "#3498db", 
            x: rect.left - parentRect.left, y: rect.top - parentRect.top, height: rect.height 
          });
        } catch (e) {}
      });
      setRemoteCursors(cursors);
    };
    awareness.on("change", update);
    return () => awareness.off("change", update);
  }, [awareness, editor]);

  return (
    <div style={{ pointerEvents: "none" }}>
      {remoteCursors.map((c) => (
        <div key={c.id} style={{ position: "absolute", left: c.x, top: c.y, width: 2, height: c.height, backgroundColor: c.color, zIndex: 10 }}>
          <div style={{ position: "absolute", top: -18, background: c.color, color: "white", fontSize: "10px", padding: "2px 4px", borderRadius: "2px", whiteSpace: "nowrap" }}>{c.name}</div>
        </div>
      ))}
    </div>
  );
}

export default function Editor({ initialTitleFromSidebar, updateLocalTitle }) {
  const { id } = useParams();
  const [docTitle, setDocTitle] = useState(initialTitleFromSidebar || "");
  const [inviteEmail, setInviteEmail] = useState("");
  
  // 1. Ref-based management to prevent "WebSocket closed" errors
  const connectedRef = useRef(false);
  const providerRef = useRef(null);

  const ydoc = useMemo(() => new Y.Doc(), [id]);
  const sharedType = useMemo(() => ydoc.get("content", Y.XmlText), [ydoc]);
  
  // 2. Stabilized Provider Initialization
  const provider = useMemo(() => {
    if (providerRef.current) providerRef.current.destroy();
    const p = new WebsocketProvider(WS_URL, `room-${id}`, ydoc, { connect: true });
    providerRef.current = p;
    return p;
  }, [id, ydoc]);

  const editor = useMemo(() => withYHistory(withYjs(withReact(createEditor()), sharedType)), [sharedType]);
  const renderLeaf = useCallback(props => <Leaf {...props} />, []);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_URL}/load/${id}`, { 
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const titleHeader = res.headers.get("x-document-title");
          if (titleHeader) setDocTitle(decodeURIComponent(titleHeader));
          const arrayBuffer = await res.arrayBuffer();
          if (arrayBuffer.byteLength > 0) {
            // Apply database state to Yjs Doc
            Y.applyUpdate(ydoc, new Uint8Array(arrayBuffer));
          }
        }
      } catch (e) { console.error("Loading Error:", e); }

      // Set user awareness for live cursors
      provider.awareness.setLocalStateField("user", { 
        name: localStorage.getItem("username") || "Anonymous", 
        color: "#" + Math.floor(Math.random() * 16777215).toString(16) 
      });

      // 3. Connect Editor to SharedType
      if (!connectedRef.current) {
        YjsEditor.connect(editor);
        connectedRef.current = true;
      }
      
      if (sharedType.length === 0 && editor.children.length === 0) {
        Transforms.insertNodes(editor, INITIAL_VALUE, { at: [0] });
      }
    };

    init();

    return () => { 
      if (connectedRef.current) {
        YjsEditor.disconnect(editor);
        connectedRef.current = false;
      }
      // Note: We don't destroy provider immediately here to avoid the "WebSocket closed" error
      // if React remounts quickly.
    };
  }, [id, editor, provider, sharedType, ydoc]);

  // Auto-save logic
  useEffect(() => {
    let timeout;
    const handleUpdate = () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const state = Y.encodeStateAsUpdate(ydoc);
        await fetch(`${API_URL}/save/${id}`, {
          method: "POST",
          headers: { 
            "Authorization": `Bearer ${localStorage.getItem("token")}`, 
            "Content-Type": "application/octet-stream" 
          },
          body: state,
        });
      }, 2000);
    };
    ydoc.on("update", handleUpdate);
    return () => { ydoc.off("update", handleUpdate); clearTimeout(timeout); };
  }, [ydoc, id]);

  const handleRename = (newTitle) => {
    setDocTitle(newTitle);
    updateLocalTitle(id, newTitle);
    clearTimeout(window.renameTimeout);
    window.renameTimeout = setTimeout(() => {
      fetch(`${API_URL}/documents/${id}/rename`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ title: newTitle }),
      });
    }, 1000);
  };

  const handleShare = async () => {
    if (!inviteEmail) return;
    const res = await fetch(`${API_URL}/share/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({ email: inviteEmail }),
    });
    if (res.ok) { alert("Shared!"); setInviteEmail(""); }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <input 
          value={docTitle} 
          onChange={(e) => handleRename(e.target.value)} 
          style={{ fontSize: "32px", fontWeight: "bold", border: "none", outline: "none", flex: 1, background: "transparent" }} 
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <input placeholder="Invite email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }} />
          <button onClick={handleShare} style={{ padding: "8px 16px", background: "#27ae60", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Invite</button>
        </div>
      </div>

      <Slate editor={editor} initialValue={INITIAL_VALUE}>
        <div style={{ display: "flex", gap: "10px", padding: "12px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: "8px 8px 0 0", borderBottom: "none" }}>
          <button onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "bold"); }} style={btnStyle}>B</button>
          <button onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "italic"); }} style={btnStyle}>I</button>
          <button onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "underline"); }} style={btnStyle}>U</button>
          <select onChange={(e) => SlateEditor.addMark(editor, "fontSize", e.target.value)} style={{ padding: "4px" }}>
            {[14, 16, 18, 20, 24, 32].map(s => <option key={s} value={s}>{s}px</option>)}
          </select>
          <input type="color" onChange={(e) => SlateEditor.addMark(editor, "color", e.target.value)} style={{ border: "none", width: "24px", cursor: "pointer" }} />
        </div>

        <div style={{ position: "relative", border: "1px solid #ddd", background: "white", padding: "40px", minHeight: "60vh", borderRadius: "0 0 8px 8px" }}>
          <RemoteCursors awareness={provider.awareness} editor={editor} />
          <Editable renderLeaf={renderLeaf} style={{ outline: "none", fontSize: "18px" }} />
        </div>
      </Slate>
    </div>
  );
}

const btnStyle = { padding: "5px 10px", border: "1px solid #ccc", background: "white", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" };