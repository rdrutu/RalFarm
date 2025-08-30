'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface ChangeCampaignStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  campaign: Campaign | null;
}

const statusOptions = [
  { value: 'planned', label: 'Planificată', color: 'bg-blue-100 text-blue-800', description: 'Campania este în faza de planificare' },
  { value: 'planted', label: 'Plantată', color: 'bg-green-100 text-green-800', description: 'Semănatul a fost finalizat' },
  { value: 'growing', label: 'În Creștere', color: 'bg-yellow-100 text-yellow-800', description: 'Culturile sunt în perioada de creștere' },
  { value: 'ready_harvest', label: 'Gata Recoltare', color: 'bg-orange-100 text-orange-800', description: 'Culturile sunt gata pentru recoltare' },
  { value: 'harvested', label: 'Recoltată', color: 'bg-purple-100 text-purple-800', description: 'Recoltarea a fost finalizată' },
  { value: 'completed', label: 'Completată', color: 'bg-gray-100 text-gray-800', description: 'Toate activitățile au fost finalizate' },
  { value: 'failed', label: 'Eșuată', color: 'bg-red-100 text-red-800', description: 'Campania nu a reușit din diverse motive' }
];

export default function ChangeCampaignStatusModal({
  isOpen,
  onClose,
  onSuccess,
  campaign
}: ChangeCampaignStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && campaign) {
      setSelectedStatus(campaign.status);
      setNotes('');
      setError(null);
    }
  }, [isOpen, campaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign || !selectedStatus) return;

    setLoading(true);
    setError(null);

    try {
      // Actualizează statusul campaniei
      const { error: updateError } = await supabase
        .from('multi_plot_campaigns')
        .update({
          status: selectedStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaign.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Adaugă înregistrare în istoric (dacă avem tabelă pentru istoric)
      if (notes.trim()) {
        // Aici putem adăuga o înregistrare în tabelă de istoric sau activity log
        console.log('Status change notes:', notes);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !campaign) return null;

  const currentStatus = statusOptions.find(s => s.value === campaign.status);
  const newStatus = statusOptions.find(s => s.value === selectedStatus);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 text-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Schimbă Status Campanie
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informații campanie */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Campania: {campaign.name}</h3>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Status actual:</span>
              {currentStatus && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${currentStatus.color}`}>
                  {currentStatus.label}
                </span>
              )}
            </div>
          </div>

          {/* Selecția noului status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Selectează noul status *
            </label>
            <div className="space-y-3">
              {statusOptions.map((status) => (
                <label
                  key={status.value}
                  className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedStatus === status.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status.value}
                    checked={selectedStatus === status.value}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <span className={`px-2 py-1 rounded-full text-sm font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      {status.value === campaign.status && (
                        <span className="text-xs text-gray-500">(current)</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{status.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Note pentru schimbarea statusului */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note despre schimbarea statusului
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              rows={3}
              placeholder="Motivul schimbării statusului, observații..."
            />
          </div>

          {/* Preview schimbare */}
          {selectedStatus && selectedStatus !== campaign.status && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Previzualizare schimbare:</h4>
              <div className="flex items-center space-x-3 text-sm">
                {currentStatus && (
                  <span className={`px-2 py-1 rounded-full font-medium ${currentStatus.color}`}>
                    {currentStatus.label}
                  </span>
                )}
                <span className="text-gray-600">→</span>
                {newStatus && (
                  <span className={`px-2 py-1 rounded-full font-medium ${newStatus.color}`}>
                    {newStatus.label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Butoane */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={loading || !selectedStatus || selectedStatus === campaign.status}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 rounded-md transition-colors"
            >
              {loading ? 'Se salvează...' : 'Schimbă Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
