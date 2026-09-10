/**
 * components/StaffPicker.jsx
 * A compact, optional "who did this?" picker backed by the staff
 * directory (plain names, no login — see /api/staff-directory).
 * Renders nothing at all if the business has no directory entries, so
 * businesses that don't use attribution see zero UI change anywhere
 * this is dropped in.
 */
import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function StaffPicker({ value, onChange, label }) {
  const [staff, setStaff] = useState(null); // null = loading, [] = none set up

  useEffect(function() {
    api.get('/staff-directory')
      .then(function(res) { setStaff(res.data.data || []); })
      .catch(function() { setStaff([]); });
  }, []);

  if (!staff || staff.length === 0) return null;

  return (
    <div className="mb-3">
      <label className="label">{label || 'Who did this? (optional)'}</label>
      <select
        className="input"
        value={value || ''}
        onChange={function(e) { onChange(e.target.value || null); }}
      >
        <option value="">Skip</option>
        {staff.map(function(s) {
          return <option key={s._id} value={s.name}>{s.name}</option>;
        })}
      </select>
    </div>
  );
}
