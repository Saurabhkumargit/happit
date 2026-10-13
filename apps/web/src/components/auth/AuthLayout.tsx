
import type { ReactNode } from "react";
import "./AuthLayout.css";

interface AuthLayoutProps {
  mode: "login" | "register";
  children: ReactNode;
}

function AuthLayout({ mode, children }: AuthLayoutProps) {
  const isLogin = mode === "login";

  return (
    <main className="auth-layout">
      <section className="auth-visual" aria-label="About Happit">
        <div className="auth-orb" aria-hidden="true" />

        <button
          type="button"
          className="auth-brand"
          onClick={() => {
            window.location.assign("/");
          }}
          aria-label="Happit home"
        >
          <img src="/happit%20logo.png" alt="" />
          <span>Happit</span>
        </button>

        <div className="auth-message">
          <span className="auth-kicker">A LITTLE BETTER, EVERY DAY</span>

          <h1>
            Consistency
            <br />
            <span>builds a better you.</span>
          </h1>

          <p>
            Small steps, done consistently,
            <br className="auth-desktop-break" />
            lead to real progress.
          </p>

          <blockquote>
            <p>
              “A little progress each day
              <br />
              adds up to big results.”
            </p>
            <cite>— Happit</cite>
          </blockquote>
        </div>

        <span className="auth-visual-footer">
          PROGRESS, NOT PERFECTION.
        </span>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <span className="auth-kicker">
            {isLogin ? "WELCOME BACK" : "YOUR NEXT CHAPTER"}
          </span>

          <p className="auth-intro">
            {isLogin
              ? "Keep showing up. You're one step closer to a better you."
              : "Start small, stay consistent, and build habits that last."}
          </p>

          {children}
        </div>
      </section>
    </main>
  );
}

export default AuthLayout;
