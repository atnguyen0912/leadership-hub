import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { RecordLossModal, SettleLossModal } from '../components/losses';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import './LossesManagement.css';

function LossesManagement() {
  const navigate = useNavigate();
  const [unsettledLosses, setUnsettledLosses] = useState([]);
  const [settledLosses, setSettledLosses] = useState([]);
  const [showSettled, setShowSettled] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedLoss, setSelectedLoss] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLosses();
  }, []);

  const fetchLosses = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      // Fetch unsettled losses
      const unsettledResponse = await fetch('/api/losses/unsettled', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (unsettledResponse.ok) {
        const unsettledData = await unsettledResponse.json();
        setUnsettledLosses(unsettledData.losses || []);
      } else {
        throw new Error('Failed to fetch unsettled losses');
      }

      // Fetch settled losses
      const settledResponse = await fetch('/api/losses?settled=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (settledResponse.ok) {
        const settledData = await settledResponse.json();
        setSettledLosses(settledData || []);
      } else {
        throw new Error('Failed to fetch settled losses');
      }
    } catch (err) {
      console.error('Error fetching losses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLossRecorded = () => {
    fetchLosses(); // Refresh data
  };

  const handleLossSettled = () => {
    fetchLosses(); // Refresh data
    setSelectedLoss(null);
  };

  const openSettleModal = (loss) => {
    setSelectedLoss(loss);
    setShowSettleModal(true);
  };

  const formatLossType = (type) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatSettleTo = (settleTo) => {
    if (settleTo === 'asb') return 'ASB (Absorbed)';
    if (settleTo === 'reimbursement') return 'Alex (Reimbursement)';
    if (settleTo?.startsWith('program:')) {
      return 'Program';
    }
    return settleTo;
  };

  const totalUnsettledAmount = unsettledLosses.reduce((sum, loss) => sum + (loss.amount || 0), 0);
  const totalSettledAmount = settledLosses.reduce((sum, loss) => sum + (loss.amount || 0), 0);

  return (
    <div>
      <Navbar />
      <div className="page-container">
        <div className="losses-management-page">
          {/* Header */}
          <div className="page-header">
            <h2>Losses Management</h2>
            <button
              className="btn btn-primary"
              onClick={() => setShowRecordModal(true)}
              style={{ background: '#ef4444' }}
            >
              + Record New Loss
            </button>
          </div>

          {error && (
            <div className="error-message" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--color-text-subtle)'
            }}>
              Loading losses data...
            </div>
          ) : (
            <>
              {/* Unsettled Losses Section */}
              <div className="losses-section unsettled-section">
                <div className="section-header">
                  <h3>
                    {unsettledLosses.length > 0 && (
                      <span className="warning-icon">⚠️</span>
                    )}
                    Unsettled Losses
                  </h3>
                  {unsettledLosses.length > 0 && (
                    <div className="summary-badge unsettled-badge">
                      {unsettledLosses.length} loss{unsettledLosses.length !== 1 ? 'es' : ''} - {formatCurrency(totalUnsettledAmount)}
                    </div>
                  )}
                </div>

                {unsettledLosses.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">✓</div>
                    <div className="empty-text">No unsettled losses</div>
                    <div className="empty-subtext">All losses have been addressed</div>
                  </div>
                ) : (
                  <div className="losses-list">
                    {unsettledLosses.map(loss => (
                      <div key={loss.id} className="loss-card unsettled-card">
                        <div className="loss-header">
                          <div className="loss-type">
                            {formatLossType(loss.loss_type)}
                          </div>
                          <div className="loss-amount unsettled-amount">
                            {formatCurrency(loss.amount)}
                          </div>
                        </div>

                        <div className="loss-details">
                          <div className="loss-detail-row">
                            <span className="detail-label">Date:</span>
                            <span className="detail-value">
                              {formatDateTime(loss.created_at)}
                            </span>
                          </div>

                          {loss.session_name && (
                            <div className="loss-detail-row">
                              <span className="detail-label">Session:</span>
                              <span className="detail-value">{loss.session_name}</span>
                            </div>
                          )}

                          {loss.description && (
                            <div className="loss-detail-row">
                              <span className="detail-label">Description:</span>
                              <span className="detail-value">{loss.description}</span>
                            </div>
                          )}

                          <div className="loss-detail-row">
                            <span className="detail-label">Created by:</span>
                            <span className="detail-value">{loss.created_by || loss.recorded_by || 'Unknown'}</span>
                          </div>
                        </div>

                        <div className="loss-actions">
                          <span className="status-badge unsettled-status">
                            ⚠️ UNSETTLED
                          </span>
                          <button
                            className="btn btn-small"
                            onClick={() => openSettleModal(loss)}
                            style={{ background: '#f59e0b' }}
                          >
                            Settle Loss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Settled Losses Section */}
              <div className="losses-section settled-section">
                <div
                  className="section-header clickable"
                  onClick={() => setShowSettled(!showSettled)}
                  style={{ cursor: 'pointer' }}
                >
                  <h3>
                    <span className="toggle-icon">{showSettled ? '▼' : '▶'}</span>
                    Settled Losses
                  </h3>
                  <div className="summary-badge settled-badge">
                    {settledLosses.length} loss{settledLosses.length !== 1 ? 'es' : ''} - {formatCurrency(totalSettledAmount)}
                  </div>
                </div>

                {showSettled && (
                  <>
                    {settledLosses.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-text">No settled losses yet</div>
                      </div>
                    ) : (
                      <div className="losses-list">
                        {settledLosses.map(loss => (
                          <div key={loss.id} className="loss-card settled-card">
                            <div className="loss-header">
                              <div className="loss-type">
                                {formatLossType(loss.loss_type)}
                              </div>
                              <div className="loss-amount settled-amount">
                                {formatCurrency(loss.amount)}
                              </div>
                            </div>

                            <div className="loss-details">
                              <div className="loss-detail-row">
                                <span className="detail-label">Date:</span>
                                <span className="detail-value">
                                  {formatDateTime(loss.created_at)}
                                </span>
                              </div>

                              {loss.session_name && (
                                <div className="loss-detail-row">
                                  <span className="detail-label">Session:</span>
                                  <span className="detail-value">{loss.session_name}</span>
                                </div>
                              )}

                              {loss.description && (
                                <div className="loss-detail-row">
                                  <span className="detail-label">Description:</span>
                                  <span className="detail-value">{loss.description}</span>
                                </div>
                              )}

                              <div className="loss-detail-row">
                                <span className="detail-label">Settled to:</span>
                                <span className="detail-value settlement-info">
                                  {formatSettleTo(loss.settled_to)}
                                </span>
                              </div>

                              <div className="loss-detail-row">
                                <span className="detail-label">Settled by:</span>
                                <span className="detail-value">{loss.settled_by}</span>
                              </div>

                              <div className="loss-detail-row">
                                <span className="detail-label">Settled on:</span>
                                <span className="detail-value">
                                  {formatDateTime(loss.settled_at)}
                                </span>
                              </div>

                              {loss.settlement_notes && (
                                <div className="loss-detail-row">
                                  <span className="detail-label">Notes:</span>
                                  <span className="detail-value">{loss.settlement_notes}</span>
                                </div>
                              )}
                            </div>

                            <div className="loss-actions">
                              <span className="status-badge settled-status">
                                ✓ SETTLED
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <RecordLossModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        onLossRecorded={handleLossRecorded}
      />

      <SettleLossModal
        isOpen={showSettleModal}
        onClose={() => {
          setShowSettleModal(false);
          setSelectedLoss(null);
        }}
        loss={selectedLoss}
        onLossSettled={handleLossSettled}
      />
    </div>
  );
}

export default LossesManagement;
