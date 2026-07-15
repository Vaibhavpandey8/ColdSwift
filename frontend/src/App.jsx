import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (window.location.origin === 'http://localhost:5173' ? 'http://localhost:5000/api' : '/api');

export default function App() {


  // Campaign States
  const [campaignStatus, setCampaignStatus] = useState({
    hasHRList: false,
    hasResume: false,
    hasContacts: false,
    stats: { total: 0, pending: 0, sent: 0, failed: 0 }
  });
  const [campaignContacts, setCampaignContacts] = useState([]);
  const [batchSize, setBatchSize] = useState(10);
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [isCampaignRunning, setIsCampaignRunning] = useState(false);
  const [campaignLogs, setCampaignLogs] = useState([]);
  const [isUploading, setIsUploading] = useState({ hr_list: false, resume: false });
  const [activeView, setActiveView] = useState("home"); // "home", "setup" or "progress"

  useEffect(() => {
    fetchCampaignStatus();
  }, []);

  const fetchCampaignStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/campaign/status`);
      const data = await response.json();
      setCampaignStatus(data);
      if (data.hasContacts) {
        fetchContacts();
      }
    } catch (e) {
      console.error('Failed to load campaign status', e);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/campaign/contacts`);
      const data = await response.json();
      setCampaignContacts(data.contacts || []);
    } catch (e) {
      console.error('Failed to fetch contacts', e);
    }
  };



  const handleCampaignFileUpload = (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(prev => ({ ...prev, [fileType]: true }));

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Data = event.target.result;
      
      try {
        const response = await fetch(`${API_BASE_URL}/campaign/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileType,
            base64Data
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'File upload failed');
        
        setCampaignLogs(prev => [`[System] ${fileType === 'hr_list' ? 'hr_list.pdf' : 'resume.pdf'} uploaded successfully.`, ...prev]);
        fetchCampaignStatus();
      } catch (error) {
        alert(error.message || 'File upload failed');
      } finally {
        setIsUploading(prev => ({ ...prev, [fileType]: false }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleParsePDF = async () => {
    setCampaignLogs(prev => ['[System] Parsing hr_list.pdf... Please wait.', ...prev]);
    try {
      const response = await fetch(`${API_BASE_URL}/campaign/parse`, { method: 'POST' });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'PDF Parsing failed');
      
      setCampaignLogs(prev => [`[System] Completed. Extracted ${data.count} HR contacts successfully!`, ...prev]);
      fetchCampaignStatus();
    } catch (error) {
      alert(error.message);
      setCampaignLogs(prev => [`[Error] Parsing failed: ${error.message}`, ...prev]);
    }
  };

  const handleRunBatch = async () => {
    if (campaignStatus.stats.pending === 0) {
      alert("No pending HR contacts left to mail.");
      return;
    }

    setIsCampaignRunning(true);
    setCampaignLogs(prev => [`[Campaign] Starting batch of ${batchSize} emails with a delay of ${delaySeconds}s...`, ...prev]);

    let sentCount = 0;
    let failedCount = 0;
    
    try {
      for (let i = 0; i < batchSize; i++) {
        const statusRes = await fetch(`${API_BASE_URL}/campaign/status`);
        const statusData = await statusRes.json();
        
        if (statusData.stats.pending === 0) {
          setCampaignLogs(prev => [`[Campaign] No pending contacts remaining. Stopping campaign.`, ...prev]);
          break;
        }

        const response = await fetch(`${API_BASE_URL}/campaign/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            limit: 1,
            delayMs: 0
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to send campaign email');

        if (data.results && data.results.length > 0) {
          const c = data.results[0];
          if (c.status === 'sent') {
            sentCount++;
            setCampaignLogs(prev => [`[SENT] ${c.name} (${c.email}) at ${c.company}`, ...prev]);
          } else {
            failedCount++;
            setCampaignLogs(prev => [`[FAILED] ${c.name} (${c.email}) at ${c.company} - Error: ${c.error}`, ...prev]);
          }
        }

        setCampaignStatus(statusData);
        fetchContacts();

        if (i < batchSize - 1) {
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
      }
      
      setCampaignLogs(prev => [`[Campaign] Batch Completed! Total Sent: ${sentCount}, Failed: ${failedCount}`, ...prev]);
    } catch (error) {
      alert(error.message);
      setCampaignLogs(prev => [`[Error] Campaign batch halted: ${error.message}`, ...prev]);
    } finally {
      setIsCampaignRunning(false);
      fetchCampaignStatus();
    }
  };

  const handleResetCampaign = async (action) => {
    const confirmation = window.confirm(
      action === 'delete' 
        ? "Warning: This will delete the uploaded files and parsed contact lists. Proceed?"
        : "This will reset all contact statuses back to 'pending'. Proceed?"
    );
    if (!confirmation) return;

    try {
      const response = await fetch(`${API_BASE_URL}/campaign/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Reset failed');
      
      setCampaignLogs(prev => [`[System] Campaign reset executed: ${data.message}`, ...prev]);
      setCampaignContacts([]);
      fetchCampaignStatus();
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '35px', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        paddingBottom: '20px',
        flexWrap: 'wrap',
        gap: '20px',
        textAlign: 'left'
      }}>
        {/* Left corner: Modern SaaS Brand Logo */}
        <div className="brand-logo-btn" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }} onClick={() => setActiveView('home')}>
          <div style={{ 
            background: 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)', 
            borderRadius: '8px', 
            width: '32px', 
            height: '32px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontWeight: 800,
            color: '#fff',
            fontSize: '1.2rem',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            ⚡
          </div>
          <span style={{ 
            fontFamily: "'Outfit', 'Inter', sans-serif", 
            fontSize: '1.45rem', 
            fontWeight: 800, 
            letterSpacing: '-0.5px',
            color: '#ffffff'
          }}>
            Cold<span style={{ color: 'var(--primary)' }}>Swift</span>
          </span>
        </div>

        {/* Premium Segmented Control Switcher */}
        <div style={{ 
          display: 'inline-flex', 
          background: 'rgba(15, 23, 42, 0.6)', 
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '30px', 
          padding: '4px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
          position: 'relative'
        }}>
          <button 
            onClick={() => setActiveView('home')} 
            style={{ 
              background: activeView === 'home' ? 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)' : 'transparent',
              color: activeView === 'home' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '26px',
              padding: '10px 24px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: activeView === 'home' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Home
          </button>

          <button 
            onClick={() => setActiveView('setup')} 
            style={{ 
              background: activeView === 'setup' ? 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)' : 'transparent',
              color: activeView === 'setup' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '26px',
              padding: '10px 24px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: activeView === 'setup' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Campaign Setup
          </button>
          
          <button 
            onClick={() => setActiveView('progress')} 
            style={{ 
              background: activeView === 'progress' ? 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)' : 'transparent',
              color: activeView === 'progress' ? '#ffffff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '26px',
              padding: '10px 24px',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: activeView === 'progress' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Campaign Progress
          </button>
        </div>
        <p className="app-subtitle" style={{ width: '100%', marginTop: '15px', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
          Upload your HR Contacts PDF, attach your resume, and write a custom cold email to launch a bulk recruiting outreach.
        </p>
      </header>

      {/* Centered Workspace Container */}
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
        {activeView === 'home' ? (
          /* Homepage View */
          <div className="glass-panel fade-in-view" style={{ padding: '40px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '16px', background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, var(--primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Welcome to ColdSwift
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '650px', margin: '0 auto 30px auto', lineHeight: '1.6' }}>
              Your ultimate cold emailing assistant to get job applications directly into HR inboxes. Custom templates, domain verification, and staggered sending built-in.
            </p>

            {/* Concept Banner Image */}
            <div style={{ marginBottom: '35px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              <img 
                src="/hero.png" 
                alt="ColdSwift Concept Interface" 
                style={{ width: '100%', height: 'auto', display: 'block', maxHeight: '420px', objectFit: 'cover' }}
              />
            </div>

            {/* Quick Action Navigation Buttons */}
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveView('setup')} 
                className="btn btn-primary"
                style={{ width: 'auto', padding: '14px 32px', fontSize: '1rem', minWidth: '220px' }}
              >
                Start Campaign Setup
              </button>
              <button 
                onClick={() => setActiveView('progress')} 
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '14px 32px', fontSize: '1rem', minWidth: '220px' }}
              >
                View Live Progress
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Intro Hero Banner */}
            <div className="glass-panel" style={{ 
              padding: '20px 24px', 
              marginBottom: '30px', 
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.07) 0%, rgba(217, 70, 239, 0.03) 100%)', 
              borderColor: 'rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              borderRadius: '12px'
            }}>
              <div style={{ 
                background: 'rgba(99, 102, 241, 0.1)', 
                borderRadius: '50%', 
                width: '48px', 
                height: '48px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontSize: '1.5rem'
              }}>
                🚀
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '4px', color: 'var(--text-primary)' }}>
                  Mailing HR Coordinators Made Easy!
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Simply upload your HR contacts PDF, attach your resume, customize your template using <strong style={{ color: 'var(--primary)' }}>{`{name}`}</strong> and <strong style={{ color: 'var(--primary)' }}>{`{company}`}</strong> placeholders, and launch your campaign batch. The system handles staggered delivery delays, dynamic placeholder replacement, and automated MX record verification!
                </p>
              </div>
            </div>

            {activeView === 'setup' ? (
              /* Left Panel: Setup & Email Template */
              <section className="glass-panel fade-in-view" style={{ padding: '35px', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              1. Campaign Setup
            </h2>

            {/* HR PDF Upload */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">HR Contacts PDF (hr_list.pdf)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn btn-secondary" style={{ width: 'auto', cursor: 'pointer', margin: 0, padding: '8px 16px', fontSize: '0.85rem' }}>
                  {isUploading.hr_list ? 'Uploading...' : 'Choose PDF'}
                  <input type="file" accept=".pdf" onChange={(e) => handleCampaignFileUpload(e, 'hr_list')} style={{ display: 'none' }} disabled={isUploading.hr_list} />
                </label>
                <div>
                  {campaignStatus.hasHRList ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: '4px' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      File Available
                    </span>
                  ) : (
                    <span style={{ color: 'var(--error)', fontSize: '0.9rem', fontWeight: 600 }}>Missing (Upload list)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Resume Upload */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Resume PDF (resume.pdf)</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn btn-secondary" style={{ width: 'auto', cursor: 'pointer', margin: 0, padding: '8px 16px', fontSize: '0.85rem' }}>
                  {isUploading.resume ? 'Uploading...' : 'Choose PDF'}
                  <input type="file" accept=".pdf" onChange={(e) => handleCampaignFileUpload(e, 'resume')} style={{ display: 'none' }} disabled={isUploading.resume} />
                </label>
                <div>
                  {campaignStatus.hasResume ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginRight: '4px' }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Resume Attached
                    </span>
                  ) : (
                    <span style={{ color: 'var(--error)', fontSize: '0.9rem', fontWeight: 600 }}>Missing (Upload resume)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Parse trigger */}
            <button 
              className="btn btn-primary" 
              onClick={handleParsePDF}
              disabled={!campaignStatus.hasHRList || isCampaignRunning}
              style={{ marginBottom: '30px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Parse HR List PDF
            </button>

            {/* Custom Email Templates */}
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              2. Email Template Spec
            </h2>

            <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--primary)' }}>
                Template: SDE Application - Vaibhav Pandey
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                <strong>Subject:</strong> Application for Software Development Engineer (SDE) role - Vaibhav Pandey
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                <strong>Body placeholders:</strong> Automatically replaces <code>{`{name}`}</code> with HR's name and <code>{`{company}`}</code> with company name.
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                <strong>Highlights:</strong> NSUT Delhi M.Tech CSE, 94.19% GATE, MERN stack full-stack projects (YatraMitra, MealCraft), and developer internship experience at Ornate TechnoServices.
              </p>
            </div>
          </section>
        ) : (
          /* Right Panel: Campaign Progress & Controls */
          <section className="glass-panel fade-in-view" style={{ padding: '35px', borderRadius: '20px', minHeight: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Campaign Progress</h2>
            </div>

            {/* Stats Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '30px' }}>
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>{campaignStatus.stats.total}</div>
              </div>
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>Pending</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>{campaignStatus.stats.pending}</div>
              </div>
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase' }}>Sent</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: 'var(--success)' }}>{campaignStatus.stats.sent}</div>
              </div>
              <div className="glass-panel" style={{ padding: '12px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.15)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--error)', textTransform: 'uppercase' }}>Failed</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px', color: 'var(--error)' }}>{campaignStatus.stats.failed}</div>
              </div>
            </div>

            {/* Campaign controls */}
            {campaignStatus.hasContacts && (
              <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px', background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.15)' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px' }}>Launch Batch Campaign</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Batch Limit (Emails count)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={batchSize} 
                      onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)} 
                      min="1" 
                      max="100" 
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Delay Interval (Seconds)</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={delaySeconds} 
                      onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 5)} 
                      min="1" 
                      max="60" 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    className="btn btn-accent" 
                    onClick={handleRunBatch}
                    disabled={isCampaignRunning || campaignStatus.stats.pending === 0}
                  >
                    {isCampaignRunning ? 'Campaign Batch Running...' : 'Launch Next Batch'}
                  </button>
                  
                  <button 
                    className="btn btn-secondary" 
                    style={{ width: 'auto' }}
                    onClick={() => handleResetCampaign('pending')}
                    disabled={isCampaignRunning}
                  >
                    Reset Status
                  </button>

                  <button 
                    className="btn btn-secondary" 
                    style={{ width: 'auto', borderColor: 'rgba(239, 68, 68, 0.3)', color: 'var(--error)' }}
                    onClick={() => handleResetCampaign('delete')}
                    disabled={isCampaignRunning}
                  >
                    Reset All
                  </button>
                </div>
              </div>
            )}

            {/* Logs Console */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>Activity Logs</h3>
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.4)', 
              borderRadius: '8px', 
              padding: '16px', 
              fontFamily: 'monospace', 
              fontSize: '0.8rem', 
              color: '#34d399', 
              height: '180px', 
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              marginBottom: '20px'
            }}>
              {campaignLogs.length === 0 && <span style={{ color: 'var(--text-muted)' }}>Console idle. Launch batch or upload files to see details.</span>}
              {campaignLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>{log}</div>
              ))}
            </div>

            {/* Contacts Table */}
            {campaignContacts.length > 0 && (
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px' }}>Extracted Contacts List ({campaignContacts.length})</h3>
                <div style={{ 
                  maxHeight: '250px', 
                  overflowY: 'auto', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: '8px', 
                  background: 'rgba(0,0,0,0.15)' 
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '8px 12px' }}>Name</th>
                        <th style={{ padding: '8px 12px' }}>Company</th>
                        <th style={{ padding: '8px 12px' }}>Email</th>
                        <th style={{ padding: '8px 12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignContacts.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{c.company}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{c.email}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <span className={`badge ${
                              c.status === 'sent' ? 'badge-success' :
                              c.status === 'failed' ? 'badge-error' :
                              c.status === 'invalid' ? 'badge-warning' :
                              ''
                            }`} style={c.status === 'pending' ? {
                              background: 'rgba(255,255,255,0.05)',
                              color: 'var(--text-secondary)',
                              border: '1px solid rgba(255,255,255,0.1)'
                            } : {}}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
          </>
        )}
      </div> {/* Close centered container */}
    </div>
  );
}
