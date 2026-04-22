"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary]", error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            maxWidth: 400,
            borderRadius: "1.5rem",
            background: "#fff",
            boxShadow: "0 8px 32px rgba(14,30,62,0.10)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "1rem",
              background: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              fontSize: 28,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: "0.5rem" }}>
            Aplikasi Mengalami Error
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1.5rem" }}>
            Terjadi kesalahan kritis. Silakan muat ulang halaman.
          </p>
          {error?.digest && (
            <p style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: "1rem", fontFamily: "monospace" }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              background: "#4F46E5",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: "pointer",
              marginRight: "0.75rem",
            }}
          >
            🔄 Coba Lagi
          </button>
          <a
            href="/"
            style={{
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#4F46E5",
              textDecoration: "none",
            }}
          >
            ← Beranda
          </a>
        </div>
      </body>
    </html>
  );
}
