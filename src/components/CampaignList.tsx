import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Timer, Calendar } from 'lucide-react';
import { supabase, ensureSession } from '../lib/supabase';
import type { Database } from '../lib/types';

type Campaign = Database['public']['Tables']['campaigns']['Row'];

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadCampaigns() {
      try {
        await ensureSession();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCampaigns(data || []);
      } catch (error) {
        console.error('Error loading campaigns:', error);
        if ((error as Error).message === 'No active session') {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    }

    loadCampaigns();
  }, []);

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Link
          to="/campaigns/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link
                to={`/campaigns/${campaign.id}`}
                className="block hover:bg-gray-50"
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {campaign.type === 'evergreen' ? (
                        <Timer className="h-5 w-5 text-green-500" />
                      ) : (
                        <Calendar className="h-5 w-5 text-blue-500" />
                      )}
                      <p className="ml-2 text-sm font-medium text-indigo-600">
                        {campaign.title}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize bg-gray-100 text-gray-800">
                        {campaign.type}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {campaign.type === 'evergreen'
                          ? `${campaign.duration_minutes} minutes`
                          : new Date(campaign.fixed_deadline!).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        Created{' '}
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}

          {campaigns.length === 0 && (
            <li className="px-4 py-8 text-center">
              <p className="text-gray-500">No campaigns yet.</p>
              <Link
                to="/campaigns/new"
                className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create your first campaign
              </Link>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}