import React from 'react';
import { X, Server, Activity, HardDrive, Network, Radio } from 'lucide-react';
import './ServiceFormModal.css'; // Reuse modal styles

const HelpModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{maxWidth: '700px'}}>
                <div className="modal-header">
                    <h2>Integration Guide</h2>
                    <button className="btn-close-modal" onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="form-scroll-area">
                    <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
                        This dashboard supports various monitoring integrations. Here is how to configure them on your devices.
                    </p>

                    <div className="help-section">
                        <div className="help-header">
                            <Activity className="icon-blue" size={20} />
                            <h3>Glances (System Stats)</h3>
                        </div>
                        <div className="help-content">
                            <p>Monitor CPU, Memory, and Disk usage of Linux/Windows/macOS systems.</p>
                            <strong>Setup:</strong>
                            <ol>
                                <li>Install Glances: <code>pip install glances[action,browser,cpu,disk,ip,memory,network,process,sensors,system]</code> or via package manager.</li>
                                <li>Start in web server mode: <code>glances -w</code></li>
                                <li>Default Port: <code>61208</code></li>
                            </ol>
                            <p className="note">The dashboard server must be able to reach the Glances IP:Port.</p>
                        </div>
                    </div>

                    <div className="help-section">
                        <div className="help-header">
                            <Server className="icon-orange" size={20} />
                            <h3>Proxmox VE</h3>
                        </div>
                        <div className="help-content">
                            <p>Monitor Node status and VM/LXC states.</p>
                            <strong>Setup:</strong>
                            <ol>
                                <li>In Proxmox, go to <strong>Datacenter &gt; Permissions &gt; API Tokens</strong>.</li>
                                <li>Create a token for a user (uncheck "Privilege Separation" if needed or assign proper permissions).</li>
                                <li>Copy the <strong>Token ID</strong> and <strong>Secret</strong>.</li>
                                <li>Format for Dashboard: <code>user@realm!tokenid=secret</code></li>
                            </ol>
                            <div className="code-example">root@pam!monitoring=12345-6789-abcd-ef01</div>
                        </div>
                    </div>

                    <div className="help-section">
                        <div className="help-header">
                            <HardDrive className="icon-cyan" size={20} />
                            <h3>TrueNAS Scale/Core</h3>
                        </div>
                        <div className="help-content">
                            <p>Monitor Pool health and usage.</p>
                            <strong>Setup:</strong>
                            <ol>
                                <li>Log in to TrueNAS Web UI.</li>
                                <li>Click on the <strong>Gear Icon (Settings) &gt; API Keys</strong>.</li>
                                <li>Click <strong>Add</strong>, name it (e.g., "Dashboard"), and copy the key.</li>
                                <li>Paste the key into the "API Key" field in the dashboard.</li>
                            </ol>
                        </div>
                    </div>

                    <div className="help-section">
                        <div className="help-header">
                            <Network className="icon-purple" size={20} />
                            <h3>SNMP (Networking)</h3>
                        </div>
                        <div className="help-content">
                            <p>Monitor routers, switches, or printers using Simple Network Management Protocol.</p>
                            <strong>Setup:</strong>
                            <ul>
                                <li>Enable SNMP Agent on your device.</li>
                                <li>Set a <strong>Community String</strong> (default is often <code>public</code>).</li>
                                <li>Find the <strong>OID</strong> (Object Identifier) for the metric you want to display.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="help-section">
                        <div className="help-header">
                            <Radio className="icon-green" size={20} />
                            <h3>ICMP / HTTP Ping</h3>
                        </div>
                        <div className="help-content">
                            <p>Basic availability check.</p>
                            <ul>
                                <li><strong>HTTP:</strong> Checks if a URL returns a 200 OK status.</li>
                                <li><strong>ICMP:</strong> (Not fully implemented in web context, falls back to HTTP/TCP check usually).</li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default HelpModal;