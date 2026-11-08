import { useState } from "react";
import type { FormEvent } from "react";
import "./Login.css";

type LoginProps = {
  onLogin: () => void;
};

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:3000";

export default function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (isRegister && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";

      const body = isRegister
        ? {
            name: name.trim(),
            email: email.trim(),
            password,
          }
        : {
            email: email.trim(),
            password,
          };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Authentication failed.");
      }

      if (!result.token || !result.user) {
        throw new Error("Invalid server response.");
      }

      // Store authentication token according to Remember me.
      localStorage.removeItem("fintrack_token");
      sessionStorage.removeItem("fintrack_token");

      if (remember || isRegister) {
        localStorage.setItem("fintrack_token", result.token);
        localStorage.setItem(
          "fintrack_user",
          JSON.stringify(result.user)
        );
      } else {
        sessionStorage.setItem("fintrack_token", result.token);
        sessionStorage.setItem(
          "fintrack_user",
          JSON.stringify(result.user)
        );
      }

      setMessage(
        isRegister
          ? "Account created successfully!"
          : "Login successful!"
      );

      onLogin();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <section className="auth-container">
        <div className="auth-brand">
          <div className="auth-brand-icon">F</div>
          <div>
            <h1>FinTrack</h1>
            <span>PERSONAL FINANCE</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-top">
            <div className="auth-icon">✦</div>

            <span className="auth-eyebrow">
              YOUR FINANCIAL JOURNEY
            </span>

            <h2>
              {isRegister ? "Create your account" : "Welcome back"}
            </h2>

            <p>
              {isRegister
                ? "Start building better financial habits today."
                : "Your finances, all in one place."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-name">Full name</label>

                <div className="auth-input-wrap">
                  <span>♙</span>
                  <input
                    id="auth-name"
                    type="text"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">Email address</label>

              <div className="auth-input-wrap">
                <span>✉</span>
                <input
                  id="auth-email"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Password</label>

              <div className="auth-input-wrap">
                <span>♙</span>

                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <small className="auth-hint">
                Minimum 8 characters
              </small>
            </div>

            {isRegister && (
              <div className="auth-field">
                <label htmlFor="auth-confirm">
                  Confirm password
                </label>

                <div className="auth-input-wrap">
                  <span>♙</span>

                  <input
                    id="auth-confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) =>
                      setConfirmPassword(e.target.value)
                    }
                    required
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            )}

            {!isRegister && (
              <div className="auth-options">
                <label className="remember-option">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="forgot-button"
                  onClick={() =>
                    setMessage(
                      "Password recovery is not available yet."
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="auth-message" role="status">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create account"
                  : "Sign in"}

              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="auth-switch">
            {isRegister
              ? "Already have an account?"
              : "Don't have an account?"}

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setMessage("");
                setPassword("");
                setConfirmPassword("");
                setShowPassword(false);
                setShowConfirm(false);
              }}
            >
              {isRegister ? "Sign in" : "Create account"}
            </button>
          </div>
        </div>

        <div className="auth-footer">
          <span>✦</span> FINTRACK · PERSONAL FINANCE MANAGEMENT
          <p>Take control of your money, one step at a time.</p>
        </div>
      </section>
    </main>
  );
}
