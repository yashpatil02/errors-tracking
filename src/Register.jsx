import React, { useState } from "react";
import { auth, db } from "./firebaseConfig";
import Swal from "sweetalert2";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "./register.css";
import { signInWithPopup } from "firebase/auth";
import { googleProvider } from "./firebaseConfig";
// import { googleProvider } from "./firebaseConfig";
import { FcGoogle } from "react-icons/fc";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("analyst");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  const handleGoogleRegister = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user already exists
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        role: "analyst",
        approved: false,
      });

      Swal.fire("Welcome 🎉", "You’re registered via Google!", "success");
    } catch (err) {
      Swal.fire("Google Signup Failed ❌", err.message, "error");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userRef = doc(db, "users", user.uid);

      if (selectedRole === "admin") {
        await setDoc(userRef, {
          uid: user.uid,
          email,
          role: "pending-admin",
          approved: false,
          requestedRole: "admin",
        });
        await addDoc(collection(db, "adminRequests"), {
          uid: user.uid,
          email,
          requestedRole: "admin",
          requestedAt: serverTimestamp(),
        });
      } else {
        await setDoc(userRef, {
          uid: user.uid,
          email,
          role: "analyst",
          approved: false,
        });
      }

      Swal.fire("Welcome 🎉", "You’re successfully registered!", "success");
    } catch (err) {
      Swal.fire("Registration Failed ❌", err.message, "error");
    }
    setLoading(false);
  };

  return (
    <div className="register-wrapper">
      <form onSubmit={handleRegister} className="register-card">
        <h2>📝 Register</h2>

       <div className="google-signin-row">
  <span className="signin-label">Register with</span>
  <button type="button" className="icon-only-btn" onClick={handleGoogleRegister}>
    <FcGoogle size={28} />
  </button>
</div>


        <div className="input-group">
          <input
            type="text"
            value={name}
            placeholder="👤 Enter your full name"
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>


        <div className="input-group">
          <input
            type="email"
            value={email}
            placeholder="✉️ Enter your email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            placeholder="🔐 Enter your password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="toggle-pass"
            onClick={() => setShowPass(!showPass)}
          >
            {showPass ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        <div className="input-group">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            required
          >
            <option value="analyst">📊 Analyst</option>
            <option value="admin">🛡️ Admin</option>
          </select>
        </div>

        <button type="submit" className="register-btn" disabled={loading}>
          🚀 Create Account
        </button>

        <p className="redirect-note">
          Already registered? <a href="/">Login</a>
        </p>
      </form>
    </div>
  );
}

export default Register;
