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
  const [passwordRules, setPasswordRules] = useState({
    hasLower: false,
    hasUpper: false,
    hasNumber: false,
    hasSymbol: false,
    hasLength: false,
  });

  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("analyst");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [nameValid, setNameValid] = useState(null); // null | true | false
  const [passwordStrength, setPasswordStrength] = useState(""); // "weak" | "medium" | "strong"
  const checkPasswordStrength = (value) => {
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);



    const score = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;

    if (value.length < 6 || score < 2) return "weak";
    if (score === 2 || score === 3) return "medium";
    if (score === 4) return "strong";
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);

    const hasLower = /[a-z]/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);
    const hasLength = value.length >= 8;

    setPasswordRules({ hasLower, hasUpper, hasNumber, hasSymbol, hasLength });

    const score = [hasLower, hasUpper, hasNumber, hasSymbol, hasLength].filter(Boolean).length;
    if (score <= 2) setPasswordStrength("weak");
    else if (score === 3 || score === 4) setPasswordStrength("medium");
    else if (score === 5) setPasswordStrength("strong");
  };



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
  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    setNameValid(value.trim().length >= 3);
  };


  const validateForm = () => {
    if (name.trim().length < 3) {
      Swal.fire("Invalid Name", "Name must be at least 3 characters long.", "warning");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Swal.fire("Invalid Email", "Please enter a valid email address.", "warning");
      return false;
    }
    if (password.length < 6) {
      Swal.fire("Weak Password", "Password must be at least 6 characters long.", "warning");
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
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
} else if (selectedRole === "qc-manager") {
  await setDoc(userRef, {
    uid: user.uid,
    email,
    role: "qc-manager",
    approved: false,
  });
} else if (selectedRole === "analyst") {
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
            onChange={handleNameChange}
            required
            className={nameValid === false ? "invalid" : nameValid === true ? "valid" : ""}
          />
          {nameValid === false && <p className="error-text">Name must be at least 3 characters</p>}
          {nameValid === true && <p className="success-text">Looks good ✅</p>}
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
          <div className="input-group input-flex">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              placeholder="🔐 Enter your password"
              onChange={handlePasswordChange}
              required
              className={passwordStrength === "weak" ? "invalid" : passwordStrength === "strong" ? "valid" : ""}
            />
            <button
              type="button"
              className="toggle-pass"
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>


          {password && (
            <div className="password-feedback">
              <p className={`strength-label ${passwordStrength}`}>Password Strength: <strong>{passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}</strong></p>
              <div className="strength-bar">
                <div className={`bar-fill ${passwordStrength}`}></div>
              </div>
              <p className="strength-desc">
                {passwordStrength === "strong"
                  ? "Strong password with good security!"
                  : passwordStrength === "medium"
                    ? "Medium strength — consider adding more variety."
                    : "Weak password — improve security by adding more characters."}
              </p>
              <ul className="password-checklist">
                <li className={passwordRules.hasLength ? "valid" : "invalid"}>✔ At least 8 characters</li>
                <li className={passwordRules.hasUpper ? "valid" : "invalid"}>✔ One uppercase letter (A-Z)</li>
                <li className={passwordRules.hasLower ? "valid" : "invalid"}>✔ One lowercase letter (a-z)</li>
                <li className={passwordRules.hasNumber ? "valid" : "invalid"}>✔ One number (0-9)</li>
                <li className={passwordRules.hasSymbol ? "valid" : "invalid"}>✔ One special character (!@#$%^&*)</li>
              </ul>
            </div>
          )}
        </div>

<div className="input-group">
  <select
    value={selectedRole}
    onChange={(e) => setSelectedRole(e.target.value)}
    required
  >
    <option value="analyst">📊 Analyst</option>
    <option value="qc-manager">📌 QC Manager</option> {/* 👈 Add this */}
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
