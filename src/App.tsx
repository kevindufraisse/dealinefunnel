import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Settings, LogOut } from 'lucide-react';
import CampaignList from './components/CampaignList';
import CampaignForm from './components/CampaignForm';
import SignupForm from './components/SignupForm';
import LoginForm from './components/LoginForm';
import { supabase } from './lib/supabase';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Settings className="h-6 w-6 text-indigo-600" />
                <span className="ml-2 text-xl font-semibold text-gray-900">
                  Countdown Admin
                </span>
              </div>
              {user && (
                <div className="flex items-center">
                  <span className="text-sm text-gray-600 mr-4">{user.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="inline-flex items-center text-gray-600 hover:text-gray-900"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={user ? <CampaignList /> : <LoginForm />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/campaigns/new" element={user ? <CampaignForm /> : <LoginForm />} />
            <Route path="/campaigns/:id" element={user ? <CampaignForm /> : <LoginForm />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;