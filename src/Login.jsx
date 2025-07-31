import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { signInWithPopup } from "firebase/auth";
import { googleProvider } from "./firebaseConfig";
import { FcGoogle } from "react-icons/fc";



import "./login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Swal.fire({
        icon: "success",
        title: "Login Successful",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        navigate("/Home");
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: err.message,
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      Swal.fire("Logged in ✅", "Welcome back!", "success").then(() => {
        navigate("/Home");
      });
    } catch (err) {
      Swal.fire("Login Failed ❌", err.message, "error");
    }
  };

  return (
    <div className="login-wrapper">
      <form onSubmit={handleLogin} className="login-card">
        <h2>🔐 Login</h2>
        <div className="google-signin-row">
          <span className="signin-label">Sign in with</span>
          <button type="button" className="icon-only-btn" onClick={handleGoogleLogin}>
            <FcGoogle size={28} />
          </button>
        </div>


        <div className="input-group">
          <input
            type="email"
            placeholder="✉️ Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <input
            type={showPass ? "text" : "password"}
            placeholder="🔑 Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="toggle-pass"
            onClick={() => setShowPass((prev) => !prev)}
          >
            {showPass ? <FaEyeSlash /> : <FaEye />}
          </button>

        </div>

        <button type="submit" className="login-btn">🚀 Login</button>
        {/* <button type="button" className="google-btn" onClick={handleGoogleLogin}>
      <FcGoogle size={20} style={{ marginRight: '10px' }} />
      Sign in with Google
    </button> */}

        <p className="redirect-note">
          New here? <a href="/register">Create account</a>
        </p>
      </form>
    </div>
  );
}

export default Login;
