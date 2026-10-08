"use client";

// Error tak terduga di panel admin. Sidebar tetap tampil karena boundary ada di bawah layout.
export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-lg rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-4xl" aria-hidden>
          ⚠️
        </p>
        <h1 className="mt-3 text-lg font-bold text-slate-900">Halaman admin gagal dimuat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cek koneksi internet booth lalu coba lagi.
          {error.message && (
            <span className="mt-2 block font-mono text-xs text-slate-400">{error.message}</span>
          )}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Coba lagi
        </button>
      </div>
    </main>
  );
}
