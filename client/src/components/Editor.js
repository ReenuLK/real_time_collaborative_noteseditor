import React, { useMemo, useEffect, useState, useRef } from "react";
import { createEditor, Transforms } from "slate";
import { Slate, Editable, withReact, ReactEditor } from "slate-react";
import * as Y from "yjs";
import { withYjs, YjsEditor, withYHistory } from "@slate-yjs/core";
import { WebsocketProvider } from "y-websocket";
import { useParams } from "react-router-dom";

const WS_URL = "ws://localhost:1234";
const API_URL = "http://localhost:5000/api";
const INITIAL_VALUE = [{ type: "paragraph", children: [{ text: "" }] }];

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
  
  // FIX: Start with the title we already have from the Sidebar
  const [docTitle, setDocTitle] = useState(initialTitleFromSidebar || "");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const connectedRef = useRef(false);

  const ydoc = useMemo(() => new Y.Doc(), [id]);
  const sharedType = useMemo(() => ydoc.get("content", Y.XmlText), [ydoc]);
  const provider = useMemo(() => new WebsocketProvider(WS_URL, `room-${id}`, ydoc), [id, ydoc]);
  const editor = useMemo(() => withYHistory(withYjs(withReact(createEditor()), sharedType)), [sharedType]);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`${API_URL}/load/${id}`, { 
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (res.ok) {
          // Double check the title from the server header
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
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <input 
          value={docTitle} 
          placeholder="Untitled Note"
          onChange={(e) => handleRename(e.target.value)} 
          style={{ fontSize: "32px", fontWeight: "bold", border: "none", outline: "none", flex: 1, background: "transparent" }} 
        />
        <div style={{ display: "flex", gap: "8px" }}>
          <input placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} style={{ padding: "8px" }} />
          <button onClick={handleShare} style={{ padding: "8px 16px", background: "#27ae60", color: "white", border: "none", borderRadius: "6px" }}>Invite</button>
        </div>
      </div>
      <Slate editor={editor} initialValue={INITIAL_VALUE}>
        <div style={{ position: "relative", border: "1px solid #ddd", background: "white", padding: "40px", minHeight: "60vh", borderRadius: "8px" }}>
          <RemoteCursors awareness={provider.awareness} editor={editor} />
          <Editable style={{ outline: "none", fontSize: "18px" }} />
        </div>
      </Slate>
    </div>
  );
}