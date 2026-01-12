import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Hook for navigation

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", username: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
    
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        if (isRegister) {
          alert("Registered successfully! Please login.");
          setIsRegister(false);
        } else {
          const data = await response.json();
          
          // 1. SAVE TO LOCAL STORAGE
          localStorage.setItem("token", data.token);
          localStorage.setItem("username", data.username);
          
          // 2. REDIRECT & REFRESH
          // We use window.location.href instead of navigate("/") here 
          // to force App.js to re-run and show the Sidebar immediately.
          window.location.href = "/"; 
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Authentication failed");
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert("Server is offline. Check backend.");
    }
  };

  return (
    <div style={{ 
      maxWidth: "350px", 
      margin: "100px auto", 
      padding: "30px", 
      textAlign: "center",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      borderRadius: "10px",
      background: "white"
    }}>
      <h2 style={{ color: "#2c3e50", marginBottom: "20px" }}>
        {isRegister ? "Create Account" : "Welcome Back"}
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {isRegister && (
          <input 
            type="text" 
            placeholder="Username" 
            required
            style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
            onChange={(e) => setFormData({...formData, username: e.target.value})} 
          />
        )}
        <input 
          type="email" 
          placeholder="Email" 
          required
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
          onChange={(e) => setFormData({...formData, email: e.target.value})} 
        />
        <input 
          type="password" 
          placeholder="Password" 
          required
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
          onChange={(e) => setFormData({...formData, password: e.target.value})} 
        />
        <button type="submit" style={{ 
          padding: "12px", 
          background: "#3498db", 
          color: "white", 
          border: "none", 
          borderRadius: "5px", 
          cursor: "pointer",
          fontWeight: "bold"
        }}>
          {isRegister ? "Register" : "Login"}
        </button>
      </form>

      <p 
        onClick={() => setIsRegister(!isRegister)} 
        style={{ cursor: "pointer", color: "#3498db", marginTop: "20px", fontSize: "14px" }}
      >
        {isRegister ? "Already have an account? Login" : "Need an account? Register"}
      </p>
    </div>
  );
}