

import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Editor from "./components/Editor";
import Login from "./components/Login";

// A small wrapper to extract the ID from the URL and find the title
function EditorWrapper({ documents, updateLocalTitle }) {
  const { id } = useParams();
  const currentDoc = documents.find((d) => d._id === id);
  
  return (
    <Editor 
      key={id} // CRITICAL: Forces Editor to reset when switching notes
      initialTitleFromSidebar={currentDoc?.title || ""} 
      updateLocalTitle={updateLocalTitle} 
    />
  );
}

function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [documents, setDocuments] = useState([]);

  const fetchDocs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:5000/api/documents", {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else if (res.status === 401 || res.status === 403) {
        handleLogout(); 
      }
    } catch (err) { console.error("Fetch error:", err); }
  }, [token]);

  useEffect(() => {
    if (token) fetchDocs();
  }, [token, fetchDocs]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setDocuments([]);
    navigate("/"); 
  };

  const updateLocalTitle = (docId, newTitle) => {
    setDocuments((prevDocs) =>
      prevDocs.map((doc) =>
        doc._id === docId ? { ...doc, title: newTitle } : doc
      )
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {token && (
        <Sidebar 
          documents={documents} 
          setDocuments={setDocuments} 
          fetchDocs={fetchDocs} 
        />
      )}
      
      <div style={{ flex: 1, height: "100vh", overflowY: "auto", background: "#f9f9f9", position: "relative" }}>
        {token && (
          <button 
            onClick={handleLogout}
            style={{ 
              position: "absolute", top: "20px", right: "20px", zIndex: 10,
              padding: "8px 15px", cursor: "pointer", background: "#e74c3c", 
              color: "white", border: "none", borderRadius: "5px" 
            }}
          >
            Logout
          </button>
        )}

        <Routes>
          <Route 
            path="/document/:id" 
            element={token ? <EditorWrapper documents={documents} updateLocalTitle={updateLocalTitle} /> : <Login />} 
          />
          <Route 
            path="/" 
            element={
              token ? (
                <div style={{ padding: "60px", textAlign: "center", color: "#95a5a6", marginTop: "100px" }}>
                  <h2>Welcome back!</h2>
                  <p>Select a note from the sidebar or create a new one.</p>
                </div>
              ) : ( <Login /> )
            } 
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;