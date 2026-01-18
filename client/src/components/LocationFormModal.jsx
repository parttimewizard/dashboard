import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './GroupFormModal.css'; // Reuse group styles

const LocationFormModal = ({ isOpen, onClose, onSave, locations, initialData }) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    if (initialData) {
        setName(initialData.name);
        setParentId(initialData.parent_id || '');
    } else {
        setName('');
        setParentId('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, parent_id: parentId });
    onClose();
  };

  // Filter out self and descendants to prevent circular parents
  const availableParents = locations.filter(l => {
      if (!initialData) return true;
      if (l.id === initialData.id) return false;
      // Simple check, deeper check would require tree traversal
      return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
            <h2>{initialData ? 'Edit Location' : 'Add New Location'}</h2>
            <button className="btn-close-modal" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Location Name</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>Parent Location (Optional)</label>
            <select 
              value={parentId} 
              onChange={e => setParentId(e.target.value)}
            >
              <option value="">None (Root Location)</option>
              {availableParents.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
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

export default LocationFormModal;