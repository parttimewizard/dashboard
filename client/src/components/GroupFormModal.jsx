import { useState } from 'react';
import { X } from 'lucide-react';
import './GroupFormModal.css';

const GroupFormModal = ({ isOpen, onClose, onSave, groups, initialData }) => {
  const [formData, setFormData] = useState(() => {
    if (initialData) {
        return {
            name: initialData.name || '',
            parent_id: initialData.parent_id || ''
        };
    }
    return {
        name: '',
        parent_id: ''
    };
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const availableParents = groups ? groups.filter(g => !initialData || g.id !== initialData.id) : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
            <h2>{initialData ? 'Edit Group' : 'Add New Group'}</h2>
            <button className="btn-close-modal" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Parent Group</label>
            <select 
              value={formData.parent_id || ''} 
              onChange={e => setFormData({...formData, parent_id: e.target.value || null})}
            >
              <option value="">None (Top Level)</option>
              {availableParents.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">Cancel</button>
            <button type="submit" className="btn-save">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupFormModal;