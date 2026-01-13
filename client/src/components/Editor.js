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

// --- 1. NEW: THE LEAF COMPONENT (STAGE 4) ---
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

// --- 2. NEW: TOGGLE MARK HELPER (STAGE 4) ---
const toggleMark = (editor, format) => {
  const marks = SlateEditor.marks(editor);
  const isActive = marks ? marks[format] === true : false;
  if (isActive) {
    SlateEditor.removeMark(editor, format);
  } else {
    SlateEditor.addMark(editor, format, true);
  }
};

// --- Remote Cursors Component ---
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const connectedRef = useRef(false);

  const ydoc = useMemo(() => new Y.Doc(), [id]);
  const sharedType = useMemo(() => ydoc.get("content", Y.XmlText), [ydoc]);
  const provider = useMemo(() => new WebsocketProvider(WS_URL, `room-${id}`, ydoc), [id, ydoc]);
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
            Y.applyUpdate(ydoc, new Uint8Array(arrayBuffer));
          }
        }
      } catch (e) { console.error("Load error:", e); }
      finally { setIsInitialLoad(false); }
      
      provider.awareness.setLocalStateField("user", { 
        name: localStorage.getItem("username") || "Anonymous", 
        color: "#" + Math.floor(Math.random() * 16777215).toString(16) 
      });

      if (!connectedRef.current) {
        YjsEditor.connect(editor);
        connectedRef.current = true;
      }
      if (sharedType.length === 0) Transforms.insertNodes(editor, INITIAL_VALUE, { at: [0] });
    };
    init();
    return () => { 
      if (connectedRef.current) { YjsEditor.disconnect(editor); connectedRef.current = false; }
      provider.disconnect(); ydoc.destroy(); 
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
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/octet-stream" },
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
    <div style={{ padding: "70px", maxWidth: "900px", margin: "0 auto" }}>
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <input 
          value={docTitle} 
          placeholder="Untitled Note"
          onChange={(e) => handleRename(e.target.value)} 
          style={{ fontSize: "32px", fontWeight: "bold", border: "none", outline: "none", flex: 1, background: "transparent" }} 
        />
        <div style={{ display: "flex", gap: "8px" }}>
          <input placeholder="Invite email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ddd" }} />
          <button onClick={handleShare} style={{ padding: "8px 16px", background: "#27ae60", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Invite</button>
        </div>
      </div>

      <Slate editor={editor} initialValue={INITIAL_VALUE}>
        {/* --- STAGE 4: FIXED TOOLBAR --- */}
        <div style={{ 
          display: "flex", alignItems: "center", gap: "10px", padding: "12px", 
          background: "#f8f9fa", border: "1px solid #ddd", borderRadius: "8px 8px 0 0",
          borderBottom: "none", sticky: "top", zIndex: 5
        }}>
          <button onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "bold"); }} style={btnStyle}>B</button>
          <button onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "italic"); }} style={btnStyle}>I</button>
          <button onMouseDown={(e) => { e.preventDefault(); toggleMark(editor, "underline"); }} style={btnStyle}>U</button>
          
          <div style={{ width: "1px", height: "20px", background: "#ccc", margin: "0 5px" }} />

          <select 
            onChange={(e) => SlateEditor.addMark(editor, "fontSize", e.target.value)}
            style={{ padding: "4px", border: "1px solid #ccc", borderRadius: "4px" }}
          >
            {[14, 16, 18, 20, 24, 28, 32, 40].map(size => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>

          <input 
            type="color" 
            onChange={(e) => SlateEditor.addMark(editor, "color", e.target.value)}
            style={{ border: "none", width: "24px", height: "24px", cursor: "pointer", background: "none" }}
          />
        </div>

        {/* EDITOR AREA */}
        <div style={{ position: "relative", border: "1px solid #ddd", background: "white", padding: "40px", minHeight: "60vh", borderRadius: "0 0 8px 8px" }}>
          <RemoteCursors awareness={provider.awareness} editor={editor} />
          <Editable 
            renderLeaf={renderLeaf}
            placeholder="Start typing your masterpiece..."
            onKeyDown={event => {
              if (!event.ctrlKey && !event.metaKey) return;
              switch (event.key) {
                case 'b': event.preventDefault(); toggleMark(editor, 'bold'); break;
                case 'i': event.preventDefault(); toggleMark(editor, 'italic'); break;
                case 'u': event.preventDefault(); toggleMark(editor, 'underline'); break;
              }
            }}
            style={{ outline: "none", fontSize: "18px", lineHeight: "1.6" }} 
          />
        </div>
      </Slate>
    </div>
  );
}

const btnStyle = {
  padding: "5px 10px", border: "1px solid #ccc", background: "white", 
  borderRadius: "4px", cursor: "pointer", fontWeight: "bold"
};
