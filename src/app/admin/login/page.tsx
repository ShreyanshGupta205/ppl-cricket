'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', {
      ...creds, redirect: false,
    });
    setLoading(false);
    if (result?.ok) {
      router.push('/admin');
    } else {
      setError('Invalid credentials. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm card-dark p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏏</div>
          <h1 className="text-2xl font-black text-[#E8510A]">PPL Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Match Scoring Panel</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={creds.username}
            onChange={e => setCreds(p => ({ ...p, username: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 
              text-white placeholder-gray-500 focus:outline-none focus:border-[#E8510A]"
          />
          <input
            type="password"
            placeholder="Password"
            value={creds.password}
            onChange={e => setCreds(p => ({ ...p, password: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 
              text-white placeholder-gray-500 focus:outline-none focus:border-[#E8510A]"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E8510A] hover:bg-[#d44a09] text-white font-bold 
              py-3 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}