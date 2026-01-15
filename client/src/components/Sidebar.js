import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function Sidebar({ documents, setDocuments }) {
  const { id: currentId } = useParams();
  const navigate = useNavigate();

  // Define the dynamic API base URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || "https://real-time-collaborative-noteseditor.onrender.com";

  const createNewDoc = async () => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      alert("No session found. Please log in again.");
      return;
    }

    try {
      // UPDATED: Replaced localhost with API_BASE_URL
      const res = await fetch(`${API_BASE_URL}/api/documents/new`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`, 
          "Content-Type": "application/json" 
        },
      });

      if (res.status === 404) {
        console.error("Route not found. Check server/index.js for /api/documents/new");
        return;
      }

      if (res.ok) {
        const newDoc = await res.json();
        setDocuments([newDoc, ...documents]);
        navigate(`/document/${newDoc._id}`);
      } else {
        const errorData = await res.json();
        console.error("Creation failed:", errorData.error);
      }
    } catch (err) {
      console.error("Network error while creating document:", err);
    }
  };

  const deleteDoc = async (e, docId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const token = localStorage.getItem("token");
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    try {
      // UPDATED: Replaced localhost with API_BASE_URL
      const res = await fetch(`${API_BASE_URL}/api/documents/${docId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (res.ok) {
        setDocuments(documents.filter(d => d._id !== docId));
        if (currentId === docId) navigate("/");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div style={{ 
      width: "260px", 
      background: "#2c3e50", 
      color: "white", 
      padding: "20px", 
      height: "100vh", 
      boxSizing: "border-box" 
    }}>
      <h3 style={{ marginTop: 0 }}>My Notes</h3>
      <button 
        onClick={createNewDoc} 
        style={{ 
          width: "100%", 
          padding: "10px", 
          marginBottom: "20px", 
          cursor: "pointer",
          backgroundColor: "#3498db",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontWeight: "bold"
        }}
      >
        + New Note
      </button>

      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 120px)" }}>
        {documents.map(doc => (
          <div 
            key={doc._id} 
            style={{ 
              display: "flex", 
              alignItems: "center",
              background: currentId === doc._id ? "#34495e" : "transparent", 
              borderRadius: "5px", 
              marginBottom: "5px",
              transition: "background 0.2s"
            }}
          >
            <Link 
              to={`/document/${doc._id}`} 
              style={{ 
                flex: 1, 
                padding: "10px", 
                color: "white", 
                textDecoration: "none",
                fontSize: "14px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              📄 {doc.title || "Untitled"}
            </Link>
            <button 
              onClick={(e) => deleteDoc(e, doc._id)} 
              style={{ 
                background: "none", 
                border: "none", 
                color: "#e74c3c", 
                cursor: "pointer",
                padding: "10px" 
              }}
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}