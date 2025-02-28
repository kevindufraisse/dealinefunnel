import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Code } from 'lucide-react';
import { supabase, ensureSession } from '../lib/supabase';
import type { Database } from '../lib/types';

type Campaign = Database['public']['Tables']['campaigns']['Row'];
type CampaignInsert = Database['public']['Tables']['campaigns']['Insert'];

export default function CampaignForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<CampaignInsert>({
    title: '',
    type: 'evergreen',
    duration_minutes: 60,
    target_urls: ['*'],
    expiration_action: { type: 'message', content: 'Offer expired' },
    styles: {
      background: '#f3f4f6',
      text: '#111827',
      button: '#3b82f6'
    }
  });

  useEffect(() => {
    if (id) {
      loadCampaign(id);
    }
  }, [id]);

  useEffect(() => {
    async function init() {
      try {
        await ensureSession();
      } catch (error) {
        console.error('Authentication error:', error);
        navigate('/');
      }
    }
    init();
  }, []);

  async function loadCampaign(campaignId: string) {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      if (data) setCampaign(data);
    } catch (error) {
      console.error('Error loading campaign:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await ensureSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (id) {
        const { error } = await supabase
          .from('campaigns')
          .update({ ...campaign, user_id: user.id })
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('campaigns')
          .insert([{ ...campaign, user_id: user.id }]);
        if (error) throw error;
      }

      navigate('/');
    } catch (error) {
      console.error('Error saving campaign:', error);
      if ((error as any)?.message?.includes('Invalid login credentials')) {
        console.error('Please check your authentication credentials');
      }
    } finally {
      setLoading(false);
    }
  }

  function getEmbedCode() {
    if (!id) return '';
    const scriptUrl = `${window.location.origin}/countdown.js`;
    return `<!-- Countdown Timer Widget -->
<div id="countdown-timer" data-countdown-widget data-campaign-id="${id}"></div>
<script type="module" src="${scriptUrl}" async defer></script>`;
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/')}
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {id ? 'Edit Campaign' : 'New Campaign'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="bg-white shadow sm:rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700"
              >
                Campaign Title
              </label>
              <input
                type="text"
                id="title"
                value={campaign.title}
                onChange={(e) =>
                  setCampaign({ ...campaign, title: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700"
              >
                Type
              </label>
              <select
                id="type"
                value={campaign.type}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    type: e.target.value as 'evergreen' | 'fixed',
                    duration_minutes:
                      e.target.value === 'evergreen' ? 60 : undefined,
                    fixed_deadline:
                      e.target.value === 'fixed'
                        ? new Date(
                            Date.now() + 7 * 24 * 60 * 60 * 1000
                          ).toISOString()
                        : undefined
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="evergreen">Evergreen</option>
                <option value="fixed">Fixed Date</option>
              </select>
            </div>

            {campaign.type === 'evergreen' ? (
              <div>
                <label
                  htmlFor="duration"
                  className="block text-sm font-medium text-gray-700"
                >
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="duration"
                  value={campaign.duration_minutes || 60}
                  onChange={(e) =>
                    setCampaign({
                      ...campaign,
                      duration_minutes: parseInt(e.target.value)
                    })
                  }
                  min="1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="deadline"
                  className="block text-sm font-medium text-gray-700"
                >
                  Fixed Deadline
                </label>
                <input
                  type="datetime-local"
                  id="deadline"
                  value={
                    campaign.fixed_deadline
                      ? new Date(campaign.fixed_deadline)
                          .toISOString()
                          .slice(0, 16)
                      : ''
                  }
                  onChange={(e) =>
                    setCampaign({
                      ...campaign,
                      fixed_deadline: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : null
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>
            )}

            <div>
              <label
                htmlFor="target_urls"
                className="block text-sm font-medium text-gray-700"
              >
                Target URLs (one per line, use * for all pages)
              </label>
              <textarea
                id="target_urls"
                value={campaign.target_urls?.join('\n')}
                onChange={(e) =>
                  setCampaign({
                    ...campaign,
                    target_urls: e.target.value
                      .split('\n')
                      .map((url) => url.trim())
                      .filter(Boolean)
                  })
                }
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Styles
              </label>
              <div className="mt-2 grid grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="bg-color"
                    className="block text-xs text-gray-500"
                  >
                    Background
                  </label>
                  <input
                    type="color"
                    id="bg-color"
                    value={(campaign.styles as any).background}
                    onChange={(e) =>
                      setCampaign({
                        ...campaign,
                        styles: {
                          ...(campaign.styles as any),
                          background: e.target.value
                        }
                      })
                    }
                    className="mt-1 block w-full"
                  />
                </div>
                <div>
                  <label
                    htmlFor="text-color"
                    className="block text-xs text-gray-500"
                  >
                    Text
                  </label>
                  <input
                    type="color"
                    id="text-color"
                    value={(campaign.styles as any).text}
                    onChange={(e) =>
                      setCampaign({
                        ...campaign,
                        styles: {
                          ...(campaign.styles as any),
                          text: e.target.value
                        }
                      })
                    }
                    className="mt-1 block w-full"
                  />
                </div>
                <div>
                  <label
                    htmlFor="button-color"
                    className="block text-xs text-gray-500"
                  >
                    Button
                  </label>
                  <input
                    type="color"
                    id="button-color"
                    value={(campaign.styles as any).button}
                    onChange={(e) =>
                      setCampaign({
                        ...campaign,
                        styles: {
                          ...(campaign.styles as any),
                          button: e.target.value
                        }
                      })
                    }
                    className="mt-1 block w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {id && (
          <div className="mt-6 bg-white shadow sm:rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Code className="h-5 w-5 mr-2" />
              Integration Code
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Copy and paste this code into your website where you want the countdown timer to appear.
            </p>
            <div className="mt-3">
              <pre className="bg-gray-50 rounded-md p-4 overflow-x-auto text-sm">
                <code>{getEmbedCode()}</code>
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(getEmbedCode());
                }}
                className="mt-2 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Copy to clipboard
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
}